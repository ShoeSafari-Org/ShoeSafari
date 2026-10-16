import { describe, expect, it } from "vitest";
import { applyVerifiedOrderRead, type StoredCustomerOrder } from "../../lib/stellar/orderStatus";
import type { OrderDetails } from "../../lib/stellar/orders";

const orderHash = "b".repeat(64);
const storedOrder: StoredCustomerOrder & { id: string } = {
  id: "firestore-order",
  orderIdHash: orderHash,
  buyerWallet: "GABC",
  tokenContract: "CUSDC",
  amountRaw: "2500000",
};

function contractOrder(status: OrderDetails["status"]): OrderDetails {
  return {
    orderId: "order-1",
    orderIdHash: orderHash,
    buyer: "GABC",
    token: "CUSDC",
    amount: 2500000n,
    amountDisplay: "0.25",
    tokenSymbol: "USDC",
    timestamp: 1,
    status,
  };
}

describe("applyVerifiedOrderRead", () => {
  it("confirms only contract state that matches the saved order terms", () => {
    const verified = applyVerifiedOrderRead(storedOrder, contractOrder("Paid"), 100);
    expect(verified.verifiedStatus).toBe("Paid");
    expect(verified.verifiedAt).toBe(100);
    expect(
      applyVerifiedOrderRead(storedOrder, { ...contractOrder("Paid"), buyer: "GOTHER" }, 100)
    ).toBe(storedOrder);
    expect(
      applyVerifiedOrderRead(
        storedOrder,
        { ...contractOrder("Paid"), orderIdHash: "c".repeat(64) },
        100
      )
    ).toBe(storedOrder);
  });

  it("does not regress a verified status when a stale contract read arrives", () => {
    const shipped = { ...storedOrder, verifiedStatus: "Shipped" as const, verifiedAt: 200 };
    expect(applyVerifiedOrderRead(shipped, contractOrder("Paid"), 300)).toBe(shipped);
    const paid = { ...storedOrder, verifiedStatus: "Paid" as const, verifiedAt: 200 };
    expect(applyVerifiedOrderRead(paid, contractOrder("Pending"), 300)).toBe(paid);
  });

  it("does not treat an unknown contract result as confirmed settlement", () => {
    expect(applyVerifiedOrderRead(storedOrder, contractOrder("Unknown"), 100)).toBe(storedOrder);
  });
});
