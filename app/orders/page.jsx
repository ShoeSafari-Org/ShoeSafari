"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../lib/AuthContext";
import { db } from "../../lib/firebaseConfig";
import { NETWORK } from "../../lib/stellar/config";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
};

const shortHash = (value) =>
  value && value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
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
        setOrders(records);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <div className="min-h-[60vh] flex items-center justify-center">Loading your orders…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-bold">Your orders</h1>
        <p>Please log in to view orders linked to your account.</p>
        <Link href="/profile/login?redirect=/orders" className="bg-red-700 text-white rounded px-5 py-2">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 mt-8">
      <h1 className="text-3xl font-bold mb-2">Your orders</h1>
      <p className="text-gray-600 mb-8">Track your ShoeSafari payments and fulfillment.</p>

      {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded p-4 mb-6">{error}</p>}
      {!error && orders.length === 0 && (
        <div className="border rounded-lg p-8 text-center">
          <p className="mb-4">You have no Stellar orders yet.</p>
          <Link href="/shop" className="text-red-700 underline">Browse the shop</Link>
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
              <span className="h-fit rounded-full bg-green-100 text-green-800 px-3 py-1 text-sm">
                {order.status || "Paid"}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <p><span className="text-gray-500">Total:</span> ${Number(order.amountUsd || 0).toFixed(2)} USDC</p>
              <p><span className="text-gray-500">Items:</span> {order.items?.length || 0}</p>
              <p><span className="text-gray-500">Network:</span> {NETWORK}</p>
            </div>
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
          </article>
        ))}
      </div>
    </main>
  );
}
