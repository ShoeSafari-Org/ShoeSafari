import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { hashOrderId } from "./stellar/scval";
import { normalizeShippingAddress } from "./shippingAddress";
import { createOrderAnonymizationPatch } from "./orderRetention";

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Reject a confirmed transaction unless its event proves the submitted checkout terms. */
export async function validateStellarOrderReceipt({ orderId, result, expectedPayment }) {
  const fail = () => {
    const error = new Error("The confirmed payment receipt does not match this order.");
    error.code = "PAYMENT_RECEIPT_MISMATCH";
    error.transactionHash = result?.hash || result?.receipt?.txHash || "";
    throw error;
  };

  if (
    !result ||
    result.status !== "SUCCESS" ||
    !result.receipt ||
    typeof orderId !== "string" ||
    !orderId ||
    typeof result.hash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(result.hash) ||
    !expectedPayment?.buyerWallet ||
    !expectedPayment?.tokenContract ||
    expectedPayment.amountRaw === undefined ||
    !expectedPayment.checkoutContractId ||
    !result.hash
  ) fail();

  let expectedOrderHash;
  let expectedAmount;
  let receiptAmount;
  let resultAmount;
  try {
    expectedOrderHash = toHex(await hashOrderId(orderId));
    expectedAmount = BigInt(expectedPayment.amountRaw);
    receiptAmount = BigInt(result.receipt.amount);
    resultAmount = BigInt(result.amountRaw);
  } catch {
    fail();
  }

  const receipt = result.receipt;
  if (
    !Number.isInteger(receipt.ledger) ||
    receipt.ledger <= 0 ||
    receipt.contractId !== expectedPayment.checkoutContractId ||
    receipt.buyer !== expectedPayment.buyerWallet ||
    receipt.token !== expectedPayment.tokenContract ||
    typeof receipt.orderId !== "string" ||
    receipt.orderId.toLowerCase() !== expectedOrderHash ||
    receiptAmount !== expectedAmount ||
    resultAmount !== expectedAmount ||
    typeof receipt.txHash !== "string" ||
    receipt.txHash.toLowerCase() !== result.hash.toLowerCase()
  ) fail();

  return true;
}

/**
 * Save the commerce details that cannot live on-chain. The Stellar contract
 * remains the source of truth for payment and escrow status; this record links
 * that payment to the customer's cart and delivery information.
 */
export async function saveStellarOrder({
  orderId,
  result,
  expectedPayment,
  customer,
  userId = null,
  items,
}) {
  await validateStellarOrderReceipt({ orderId, result, expectedPayment });

  if (!db) {
    throw new Error("Order database is not configured.");
  }

  const receipt = result.receipt || {};
  const order = {
    orderId,
    paymentMethod: "stellar",
    status: "Paid",
    confirmationStatus: result.status,
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
      // Legacy orders used a plain string. The normalizer keeps those records
      // displayable while all new order records use the structured address.
      address: normalizeShippingAddress(customer.address),
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
  await updateDoc(doc(db, "ShoeSafariOrders", orderDocumentId), {
    status,
    updatedAt: serverTimestamp(),
    ...(completed ? { completedAt: serverTimestamp() } : {}),
  });
}

export async function addOrderSupportNote({ orderIdHash, note, resolutionStatus = "open" }) {
  if (!db || !auth?.currentUser) throw new Error("Admin authentication is required.");
  const trimmed = String(note || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(orderIdHash) || !trimmed || trimmed.length > 2000) {
    throw new Error("Support notes require a valid order hash and 1-2000 characters.");
  }
  if (!["open", "resolved"].includes(resolutionStatus)) {
    throw new Error("Invalid support note resolution status.");
  }
  const reference = await addDoc(collection(db, "ShoeSafariOrderNotes"), {
    orderIdHash,
    note: trimmed,
    resolutionStatus,
    authorUid: auth.currentUser.uid,
    authorEmail: auth.currentUser.email || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: reference.id, orderIdHash, note: trimmed, resolutionStatus };
}

export async function updateOrderSupportNote(noteId, resolutionStatus) {
  if (!db || !auth?.currentUser) throw new Error("Admin authentication is required.");
  if (!["open", "resolved"].includes(resolutionStatus)) {
    throw new Error("Invalid support note resolution status.");
  }
  await updateDoc(doc(db, "ShoeSafariOrderNotes", noteId), {
    resolutionStatus,
    updatedAt: serverTimestamp(),
  });
}

/** Reconcile a verified chain event; a higher ledger always wins. */
export async function reconcileStellarOrderEvent({ order, event }) {
  if (
    !db ||
    !order ||
    !event ||
    !/^[a-f0-9]{64}$/i.test(order.orderId || "") ||
    !/^[a-f0-9]{64}$/i.test(event.txHash || "") ||
    !Number.isSafeInteger(event.ledger) ||
    event.ledger <= 0 ||
    !["Pending", "Paid", "Shipped", "Refunded"].includes(order.status)
  ) return { updated: 0, skipped: 0 };

  const snapshot = await getDocs(
    query(collection(db, "ShoeSafariOrders"), where("orderIdHash", "==", order.orderId))
  );
  let updated = 0;
  let skipped = 0;
  for (const orderDoc of snapshot.docs) {
    const current = orderDoc.data();
    const currentLedger = Number(current.chainLedger ?? 0);
    if (Number.isSafeInteger(currentLedger) && currentLedger >= event.ledger) {
      skipped += 1;
      continue;
    }

    const mismatchReason = current.status && current.status !== order.status
      ? `firestore_${current.status.toLowerCase()}_chain_${order.status.toLowerCase()}`
      : "chain_event_reconciliation";
    await updateDoc(doc(db, "ShoeSafariOrders", orderDoc.id), {
      status: order.status,
      chainStatus: order.status,
      chainLedger: event.ledger,
      chainEventHash: event.txHash,
      reconciliationReason: mismatchReason,
      reconciledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    updated += 1;
  }
  return { updated, skipped };
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
