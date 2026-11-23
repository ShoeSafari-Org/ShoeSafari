import { describe, expect, it } from "vitest";
import { formatOrderExport, toOrderExportRows } from "../../lib/orderExport";

const order = {
  orderId: "order,1",
  amount: "12.50",
  amountRaw: 125000000n,
  tokenSymbol: "USDC",
  status: "Shipped",
  timestamp: Date.parse("2026-11-23T12:00:00.000Z"),
  ledger: 42,
  txHash: "a".repeat(64),
  commerce: {
    orderReference: "SS-2026-0001",
    customer: { email: "private@example.test" },
    items: [{ name: "Private product" }],
  },
};

describe("merchant order exports", () => {
  it("uses stable privacy-safe JSON fields and omits retained customer data", () => {
    const rows = toOrderExportRows([order]);
    expect(rows[0]).toEqual({
      order_id: "order,1",
      order_reference: "SS-2026-0001",
      status: "Shipped",
      token: "USDC",
      amount: "12.50",
      amount_raw: "125000000",
      occurred_at: "2026-11-23T12:00:00.000Z",
      ledger: 42,
      transaction_hash: "a".repeat(64),
    });
    expect(JSON.stringify(rows)).not.toContain("private@example.test");
    expect(JSON.stringify(rows)).not.toContain("Private product");
  });

  it("escapes commas, quotes, and newlines in operational fields", () => {
    const csv = formatOrderExport(
      [{ ...order, commerce: { orderReference: 'ref,"quoted"\nline' } }],
      "csv"
    );
    expect(csv).toContain('"order,1"');
    expect(csv).toContain('"ref,""quoted""\nline"');
  });
});
