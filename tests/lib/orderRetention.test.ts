import {
  createOrderAnonymizationPatch,
  isOrderRetentionDue,
  ORDER_PERSONAL_DATA_RETENTION_MS,
} from "../../lib/orderRetention";

describe("order personal-data retention", () => {
  it("allows anonymization after one year for a completed order", () => {
    const completedAt = 1_000;
    const order = { status: "Shipped", completedAt };

    expect(isOrderRetentionDue(order, completedAt + ORDER_PERSONAL_DATA_RETENTION_MS)).toBe(true);
    expect(
      createOrderAnonymizationPatch(order, {
        now: completedAt + ORDER_PERSONAL_DATA_RETENTION_MS,
      })
    ).toEqual({
      userId: null,
      buyerWallet: null,
      customer: { firstName: "", lastName: "", email: "", address: "" },
    });
  });

  it("keeps chain references and order accounting fields when applied", () => {
    const completedAt = 1_000;
    const order = {
      orderId: "SS-accounting-order",
      transactionHash: "stellar-tx-hash",
      orderIdHash: "stellar-order-hash",
      amountRaw: "1500000",
      buyerWallet: "GABC",
      userId: "firebase-user",
      customer: {
        firstName: "Buyer",
        lastName: "Name",
        email: "buyer@example.com",
        address: "1 Main St",
      },
      status: "Refunded",
      completedAt,
    };

    const anonymized = {
      ...order,
      ...createOrderAnonymizationPatch(order, {
        now: completedAt,
        customerRequest: true,
      }),
    };

    expect(anonymized).toMatchObject({
      orderId: "SS-accounting-order",
      transactionHash: "stellar-tx-hash",
      orderIdHash: "stellar-order-hash",
      amountRaw: "1500000",
      userId: null,
      buyerWallet: null,
      customer: { firstName: "", lastName: "", email: "", address: "" },
    });
  });

  it("requires completion and either retention expiry or a verified request", () => {
    expect(() => createOrderAnonymizationPatch({ status: "Paid", completedAt: 0 })).toThrow(
      /completed orders/i
    );
    expect(() =>
      createOrderAnonymizationPatch(
        { status: "Shipped", completedAt: 1_000 },
        { now: 2_000 }
      )
    ).toThrow(/one year/i);
    expect(isOrderRetentionDue({ status: "Paid", completedAt: 0 }, Number.MAX_SAFE_INTEGER)).toBe(
      false
    );
  });
});
