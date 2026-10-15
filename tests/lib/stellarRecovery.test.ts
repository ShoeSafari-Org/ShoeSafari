import {
  clearPendingPayment,
  loadPendingPayment,
  savePendingPayment,
} from "../../lib/stellar/recovery";

const HASH = "a".repeat(64);

describe("Stellar payment recovery", () => {
  beforeEach(() => localStorage.clear());

  it("persists only the transaction hash and order reference", () => {
    savePendingPayment({ hash: HASH, orderId: "SS-order-123" });

    expect(loadPendingPayment()).toEqual({ hash: HASH, orderId: "SS-order-123" });
    expect(localStorage.getItem("shoesafari:stellar-pending-payment")).toBe(
      JSON.stringify({ hash: HASH, orderId: "SS-order-123" })
    );
  });

  it("clears malformed or incomplete recovery data", () => {
    localStorage.setItem(
      "shoesafari:stellar-pending-payment",
      JSON.stringify({ hash: "not-a-hash", orderId: "SS-order-123", secret: "never" })
    );

    expect(loadPendingPayment()).toBeNull();
    expect(localStorage.getItem("shoesafari:stellar-pending-payment")).toBeNull();
  });

  it("removes recovery data after a terminal result", () => {
    savePendingPayment({ hash: HASH, orderId: "SS-order-123" });

    clearPendingPayment();

    expect(loadPendingPayment()).toBeNull();
  });
});
