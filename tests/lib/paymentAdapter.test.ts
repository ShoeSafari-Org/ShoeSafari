import { describe, expect, it } from "vitest";
import {
  isTerminalPaymentStatus,
  type PaymentAdapter,
  type PaymentRequest,
} from "../../lib/payments/adapter";

describe("payment adapter contract", () => {
  it("supports an asynchronous rail without prescribing provider details", async () => {
    const adapter: PaymentAdapter = {
      id: "test-rail",
      displayName: "Test rail",
      capabilities: { customerAction: false, reconciliation: true, refunds: false },
      async pay(request) {
        return { status: "pending", reference: `attempt:${request.orderId}` };
      },
      async getStatus(reference) {
        return { status: "succeeded", reference };
      },
    };
    const request: PaymentRequest = {
      orderId: "SS-test-1",
      assetId: "test-token",
      amount: { currency: "USD", value: "12.34", minorUnits: "1234" },
    };

    const pending = await adapter.pay(request);
    expect(pending).toEqual({ status: "pending", reference: "attempt:SS-test-1" });
    expect(await adapter.getStatus(pending.reference!)).toEqual({
      status: "succeeded",
      reference: "attempt:SS-test-1",
    });
  });

  it("defines terminal states explicitly so pending is never treated as failure", () => {
    expect(isTerminalPaymentStatus("pending")).toBe(false);
    expect(isTerminalPaymentStatus("succeeded")).toBe(true);
    expect(isTerminalPaymentStatus("failed")).toBe(true);
  });
});
