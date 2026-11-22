"use client";

import { useEffect, useState } from "react";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useAuth } from "../../../lib/AuthContext";
import { auth, db } from "../../../lib/firebaseConfig";

const emptyCustomer = { firstName: "", lastName: "", email: "", address: "" };

export default function AccountDataPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || !db) { setLoading(false); return; }
    getDocs(query(collection(db, "ShoeSafariOrders"), where("userId", "==", user.uid)))
      .then((snapshot) => setOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))))
      .catch(() => setError("Could not load your order data."))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), orders }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shoesafari-account-data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const requestDeletion = async () => {
    if (!user || !auth?.currentUser || !db) return;
    setError(""); setMessage("");
    if (!password) { setError("Enter your password to confirm account deletion."); return; }
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email || "", password));
      await addDoc(collection(db, "ShoeSafariDeletionRequests"), {
        userId: user.uid,
        orderCount: orders.length,
        requestedAt: serverTimestamp(),
        status: "requested",
      });
      await Promise.all(orders.map((order) => updateDoc(doc(db, "ShoeSafariOrders", order.id), {
        customer: emptyCustomer,
        userId: null,
        buyerWallet: null,
        personalDataAnonymizedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })));
      await deleteUser(auth.currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion could not be completed.");
    }
  };

  if (authLoading || loading) return <main className="mx-auto mt-12 max-w-2xl px-4"><p role="status">Loading account data…</p></main>;
  if (!user) return <main className="mx-auto mt-12 max-w-2xl px-4"><h1 className="text-2xl font-bold">Log in to manage your data</h1></main>;

  return (
    <main className="mx-auto mt-12 max-w-2xl px-4 pb-12">
      <h1 className="text-3xl font-bold">Your data</h1>
      <p className="mt-2 text-gray-600">Export your order records or request deletion of your account and personal order data.</p>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700" role="alert">{error}</p>}
      {message && <p className="mt-4 rounded bg-green-50 p-3 text-green-700" role="status">{message}</p>}
      <section className="mt-6 rounded border bg-white p-5">
        <h2 className="font-semibold">Export</h2>
        <p className="mt-2 text-sm text-gray-600">Download the order data currently visible to your account.</p>
        <button type="button" onClick={exportData} className="mt-4 rounded bg-blue-700 px-4 py-2 text-white">Download my data</button>
      </section>
      <section className="mt-6 rounded border border-red-200 bg-red-50 p-5">
        <h2 className="font-semibold text-red-800">Delete account and personal data</h2>
        <p className="mt-2 text-sm text-red-700">Reauthentication is required. Immutable payment references and transaction hashes are retained for accounting; customer fields are anonymized first.</p>
        <label className="mt-4 block text-sm font-medium text-red-900">Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded border px-3 py-2" autoComplete="current-password" />
        </label>
        <button type="button" onClick={requestDeletion} className="mt-4 rounded bg-red-700 px-4 py-2 text-white">Delete my account</button>
      </section>
    </main>
  );
}
