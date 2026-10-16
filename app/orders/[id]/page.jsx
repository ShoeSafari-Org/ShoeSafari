"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import EmptyState from "../../../components/EmptyState";
import { useAuth } from "../../../lib/AuthContext";
import { db } from "../../../lib/firebaseConfig";

const formatDate = (value) => {
  const date = value?.toDate?.() ?? (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "Date unavailable";
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!user || typeof id !== "string" || !db) {
      setLoading(false);
      setUnavailable(true);
      return () => { active = false; };
    }

    getDoc(doc(db, "ShoeSafariOrders", id))
      .then((snapshot) => {
        if (!active) return;
        if (!snapshot.exists()) {
          setUnavailable(true);
          return;
        }
        // Firestore rules permit this read only to the owner (or an admin).
        setOrder({ id: snapshot.id, ...snapshot.data() });
      })
      .catch(() => {
        if (active) setUnavailable(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, id, user]);

  if (authLoading || loading) {
    return <main className="mx-auto mt-12 max-w-3xl px-4" aria-busy="true"><p role="status">Loading order…</p></main>;
  }

  if (!user) {
    return <main className="mx-auto mt-12 max-w-3xl px-4"><h1 className="text-2xl font-bold">Log in to view this order</h1><Link className="mt-4 inline-block text-red-700 underline" href={`/profile/login?redirect=${encodeURIComponent(`/orders/${id}`)}`}>Log in</Link></main>;
  }

  if (unavailable || !order) {
    return <main className="mx-auto mt-12 max-w-3xl px-4"><EmptyState illustration="orders" title="Order unavailable" description="This order may not exist or may not be accessible to this account." actionHref="/orders" actionLabel="Back to your orders" /></main>;
  }

  const customer = order.customer || {};
  const address = customer.address;
  const addressText = typeof address === "string"
    ? address
    : address && typeof address === "object"
      ? [address.addressLine1, address.addressLine2, address.city, address.region, address.postalCode, address.country].filter(Boolean).join(", ")
      : "Not available";

  return (
    <main className="mx-auto mt-12 max-w-3xl px-4 pb-12">
      <Link href="/orders" className="text-sm text-red-700 underline">← Your orders</Link>
      <h1 className="mt-5 text-3xl font-bold">Order details</h1>
      <p className="mt-2 text-gray-600">Order {order.orderId || order.id}</p>
      <section className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Payment and fulfillment</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-gray-500">Last recorded status</dt><dd>{order.status || "Pending"}</dd></div>
          <div><dt className="text-sm text-gray-500">Order date</dt><dd>{formatDate(order.createdAt)}</dd></div>
          <div><dt className="text-sm text-gray-500">Total</dt><dd>{order.amountUsd != null ? `$${Number(order.amountUsd).toFixed(2)} USD` : "Unavailable"}</dd></div>
          <div><dt className="text-sm text-gray-500">Payment transaction</dt><dd className="break-all">{order.transactionHash || "Unavailable"}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-gray-500">The status shown here is the last saved order status; refresh your orders page to check Stellar for an updated status.</p>
      </section>
      <section className="mt-5 rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Items</h2>
        {Array.isArray(order.items) && order.items.length > 0 ? <ul className="mt-3 divide-y">{order.items.map((item, index) => <li key={`${item.productId || item.name}-${index}`} className="flex justify-between gap-3 py-3"><span>{item.name || item.productId || "Product"} × {item.quantity || 1}</span><span>{item.totalUsd == null ? "" : `$${Number(item.totalUsd).toFixed(2)}`}</span></li>)}</ul> : <p className="mt-3 text-gray-600">No item details were saved for this order.</p>}
      </section>
      <section className="mt-5 rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Delivery details</h2>
        <p className="mt-3">{[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Name unavailable"}</p>
        <p>{customer.email || "Email unavailable"}</p>
        <p className="mt-2">{addressText}</p>
      </section>
    </main>
  );
}
