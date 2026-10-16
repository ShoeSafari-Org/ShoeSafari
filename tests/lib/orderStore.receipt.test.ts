import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(() => "orders"),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  updateDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../../lib/firebaseConfig", () => ({ db: { name: "test-db" } }));

import { saveStellarOrder } from "../../lib/orderStore";
import { hashOrderId } from "../../lib/stellar/scval";

const orderId = "SS-verified-order";
const hashHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function validOrder() {
  const orderHash = hashHex(await hashOrderId(orderId));
  const result: {
    status: string;
    hash: string;
    amountRaw: bigint;
    amountUsd: number;
    receipt: {
      contractId: string;
      buyer: string;
      token: string;
      orderId: string;
      amount: string;
      txHash: string;
      ledger: number;
    } | null;
  } = {
    status: "SUCCESS",
    hash: "a".repeat(64),
    amountRaw: 12500000n,
    amountUsd: 1.25,
    receipt: {
      contractId: "CCHECKOUT",
      buyer: "GBUYER",
      token: "CTOKEN",
      orderId: orderHash,
      amount: "12500000",
      txHash: "a".repeat(64),
      ledger: 42,
    },
  };
  const expectedPayment = {
    buyerWallet: "GBUYER",
    tokenContract: "CTOKEN",
    checkoutContractId: "CCHECKOUT",
    amountRaw: "12500000",
  };
  return { orderId, result, expectedPayment, customer: {}, items: [] };
}

describe("saveStellarOrder receipt validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestore.addDoc.mockResolvedValue({ id: "saved-order" });
  });

  it("persists a receipt matching the submitted checkout and transaction hash", async () => {
    const input = await validOrder();

    await expect(saveStellarOrder(input)).resolves.toBe("saved-order");
    expect(firestore.addDoc).toHaveBeenCalledTimes(1);
    expect(firestore.addDoc.mock.calls[0][1]).toMatchObject({
      transactionHash: input.result.hash,
      status: "Paid",
      orderIdHash: input.result.receipt?.orderId,
    });
  });

  it("skips Firestore when the receipt is missing", async () => {
    const input = await validOrder();
    input.result.receipt = null;

    await expect(saveStellarOrder(input)).rejects.toMatchObject({
      code: "PAYMENT_RECEIPT_MISMATCH",
      transactionHash: input.result.hash,
    });
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it("skips Firestore when transaction confirmation is unsuccessful", async () => {
    const input = await validOrder();
    input.result.status = "PENDING";

    await expect(saveStellarOrder(input)).rejects.toThrow(/receipt does not match/i);
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it.each([
    ["buyer", (receipt: Record<string, unknown>) => (receipt.buyer = "GOTHER")],
    ["token", (receipt: Record<string, unknown>) => (receipt.token = "COTHER")],
    ["order hash", (receipt: Record<string, unknown>) => (receipt.orderId = "f".repeat(64))],
    ["amount", (receipt: Record<string, unknown>) => (receipt.amount = "12500001")],
    ["checkout contract", (receipt: Record<string, unknown>) => (receipt.contractId = "COTHER")],
    ["transaction hash", (receipt: Record<string, unknown>) => (receipt.txHash = "b".repeat(64))],
  ])("skips Firestore when the receipt %s mismatches", async (_field, mismatch) => {
    const input = await validOrder();
    mismatch(input.result.receipt as unknown as Record<string, unknown>);

    await expect(saveStellarOrder(input)).rejects.toThrow(/receipt does not match/i);
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it("rejects a result amount that differs from the expected payment", async () => {
    const input = await validOrder();
    input.result.amountRaw = 12500001n;

    await expect(saveStellarOrder(input)).rejects.toThrow(/receipt does not match/i);
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });
});
