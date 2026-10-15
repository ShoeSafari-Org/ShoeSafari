import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { createOrderAnonymizationPatch } from "./orderRetention";

/**
 * Save the commerce details that cannot live on-chain. The Stellar contract
 * remains the source of truth for payment and escrow status; this record links
 * that payment to the customer's cart and delivery information.
 */
export async function saveStellarOrder({ orderId, result, customer, userId = null, items }) {
  if (!db) {
    throw new Error("Order database is not configured.");
  }

  const receipt = result.receipt || {};
  const order = {
    orderId,
    paymentMethod: "stellar",
    status: "Paid",
    userId,
    amountUsd: Number(result.amountUsd),
    amountRaw: result.amountRaw.toString(),
    transactionHash: result.hash,
    ledger: receipt.ledger ?? null,
    buyerWallet: receipt.buyer ?? null,
    tokenContract: receipt.token ?? null,
    orderIdHash: receipt.orderId ?? null,
    customer: {
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      email: customer.email || "",
      address: customer.address || "",
    },
    items,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(collection(db, "ShoeSafariOrders"), order);
  return reference.id;
}

export async function updateStellarOrderStatus(orderDocumentId, status) {
  if (!db) {
    throw new Error("Order database is not configured.");
  }

  const completed = status === "Shipped" || status === "Refunded";
  const updates = {
    status,
    updatedAt: serverTimestamp(),
    ...(completed ? { completedAt: serverTimestamp() } : {}),
  };
  await updateDoc(doc(db, "ShoeSafariOrders", orderDocumentId), updates);
}

export async function anonymizeStellarOrderPersonalData(
  orderDocumentId,
  { customerRequest = false } = {}
) {
  if (!db) {
    throw new Error("Order database is not configured.");
  }

  const reference = doc(db, "ShoeSafariOrders", orderDocumentId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    throw new Error("Order not found.");
  }

  const personalDataPatch = createOrderAnonymizationPatch(snapshot.data(), {
    customerRequest,
  });
  await updateDoc(reference, {
    ...personalDataPatch,
    personalDataAnonymizedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
