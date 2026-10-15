"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../lib/AuthContext";
import { db } from "../../lib/firebaseConfig";
import { OrderCardSkeleton, PageHeaderSkeleton } from "../../components/Skeleton";
import { readOrder } from "../../lib/stellar/orders";
import { applyVerifiedOrderRead } from "../../lib/stellar/orderStatus";
import {
  formatTokenAmount,
  NETWORK,
  tokenSymbolForContract,
  USDC_CONTRACT_ID,
} from "../../lib/stellar/config";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
};

const shortHash = (value) =>
  value && value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;

const formatOrderTotal = (order) => {
  if (order.tokenContract === USDC_CONTRACT_ID) {
    return `$${Number(order.amountUsd || 0).toFixed(2)} USDC`;
  }

  const symbol = tokenSymbolForContract(order.tokenContract);
  if (!order.amountRaw || symbol === "Unknown token") return symbol;
  return `${formatTokenAmount(order.amountRaw, order.tokenContract)} ${symbol}`;
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadOrders = async () => {
      try {
        if (!db) throw new Error("Order database is not configured.");
        const snapshot = await getDocs(
          query(collection(db, "ShoeSafariOrders"), where("userId", "==", user.uid))
        );
        const records = snapshot.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }));
        records.sort((a, b) => {
          const left = a.createdAt?.toMillis?.() || 0;
          const right = b.createdAt?.toMillis?.() || 0;
          return right - left;
        });
        if (cancelled) return;
        setOrders((previous) => {
          const previousById = new Map(previous.map((order) => [order.id, order]));
          return records.map((order) => {
            const previousOrder = previousById.get(order.id);
            return {
              ...order,
              verifiedStatus: previousOrder?.verifiedStatus,
              verifiedAt: previousOrder?.verifiedAt,
            };
          });
        });
        setError("");
        setRefreshError("");
        setRefreshing(records.length > 0);

        let unverifiedCount = 0;
        for (const record of records) {
          if (cancelled) return;
          if (!record.orderId || !record.orderIdHash) {
            unverifiedCount += 1;
            continue;
          }
          try {
            const contractOrder = await readOrder(record.orderId);
            if (!contractOrder) {
              unverifiedCount += 1;
              continue;
            }
            const checkedAt = Date.now();
            setOrders((current) =>
              current.map((order) =>
                order.id === record.id
                  ? applyVerifiedOrderRead(order, contractOrder, checkedAt)
                  : order
              )
            );
          } catch {
            unverifiedCount += 1;
          }
        }
        if (!cancelled && unverifiedCount > 0) {
          setRefreshError(
            `Could not verify ${unverifiedCount} ${unverifiedCount === 1 ? "order" : "orders"} from Stellar. Showing the last verified status where available.`
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
        }
      } finally {
        if (!cancelled) setRefreshing(false);
        if (!cancelled) setLoading(false);
      }
    };

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, refreshKey]);

  if (authLoading || loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12 mt-8" aria-busy="true">
        <p className="sr-only" role="status">Loading your orders</p>
        <PageHeaderSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => <OrderCardSkeleton key={index} />)}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-bold">Your orders</h1>
        <p>Please log in to view orders linked to your account.</p>
        <Link
          href="/profile/login?redirect=/orders"
          className="bg-red-700 text-white rounded px-5 py-2"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 mt-8">
      <h1 className="text-3xl font-bold mb-2">Your orders</h1>
      <p className="text-gray-600 mb-8">Track your ShoeSafari payments and fulfillment.</p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            setRefreshError("");
            setRefreshKey((current) => current + 1);
          }}
          disabled={refreshing}
          className="rounded border border-gray-400 px-4 py-2 text-sm disabled:opacity-60"
        >
          {refreshing ? "Checking Stellar…" : "Refresh on-chain status"}
        </button>
        <p className="text-sm text-gray-600" aria-live="polite">
          {refreshError
            ? refreshError
            : "Statuses come from the checkout contract; unverified Firestore values are not shown as confirmed."}
        </p>
      </div>

      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded p-4 mb-6">{error}</p>
      )}
      {!error && orders.length === 0 && (
        <div className="border rounded-lg p-8 text-center">
          <p className="mb-4">You have no Stellar orders yet.</p>
          <Link href="/shop" className="text-red-700 underline">
            Browse the shop
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="border rounded-lg p-5 bg-white shadow-sm">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold">Order {order.orderId}</h2>
                <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
              </div>
              <span className={`h-fit rounded-full px-3 py-1 text-sm ${order.verifiedStatus ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                {order.verifiedStatus || "Awaiting on-chain verification"}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <p>
                <span className="text-gray-500">Total:</span> {formatOrderTotal(order)}
              </p>
              <p>
                <span className="text-gray-500">Items:</span> {order.items?.length || 0}
              </p>
              <p>
                <span className="text-gray-500">Network:</span> {NETWORK}
              </p>
            </div>
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <h3 className="text-sm font-medium mb-2">Purchased items</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {order.items.map((item, index) => (
                    <li key={`${item.productId || item.id || "item"}-${index}`}>
                      {item.name || item.title || `Product ${item.productId || item.id || index + 1}`}
                      <span className="text-gray-500"> · Qty {item.quantity || 1}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {order.transactionHash && (
              <a
                href={`https://stellar.expert/explorer/${NETWORK}/tx/${order.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 text-sm text-blue-700 underline font-mono"
              >
                View transaction {shortHash(order.transactionHash)}
              </a>
            )}
            {!order.verifiedStatus && (
              <p className="mt-3 text-sm text-amber-800">
                This order’s status has not been confirmed by a contract read.
              </p>
            )}
            {order.verifiedAt && (
              <p className="mt-3 text-xs text-gray-500">
                Last verified from Stellar: {new Date(order.verifiedAt).toLocaleString()}
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
