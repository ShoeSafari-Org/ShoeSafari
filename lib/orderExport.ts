export const ORDER_EXPORT_COLUMNS = [
  "order_id",
  "order_reference",
  "status",
  "token",
  "amount",
  "amount_raw",
  "occurred_at",
  "ledger",
  "transaction_hash",
] as const;

export type OrderExportFormat = "csv" | "json";

export interface ExportableOrder {
  orderId: string;
  amount: string;
  amountRaw: bigint;
  tokenSymbol: string;
  status: string;
  timestamp: number;
  ledger: number;
  txHash: string;
  commerce?: { orderReference?: string | null };
}

export type OrderExportRow = Record<(typeof ORDER_EXPORT_COLUMNS)[number], string | number>;

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toOrderExportRows(orders: ExportableOrder[]): OrderExportRow[] {
  return orders.map((order) => ({
    order_id: order.orderId,
    order_reference: order.commerce?.orderReference || "",
    status: order.status,
    token: order.tokenSymbol,
    amount: order.amount,
    amount_raw: order.amountRaw.toString(),
    occurred_at: new Date(order.timestamp).toISOString(),
    ledger: order.ledger,
    transaction_hash: order.txHash,
  }));
}

export function formatOrderExport(orders: ExportableOrder[], format: OrderExportFormat): string {
  const rows = toOrderExportRows(orders);
  if (format === "json") return JSON.stringify(rows, null, 2);

  return [
    ORDER_EXPORT_COLUMNS.join(","),
    ...rows.map((row) => ORDER_EXPORT_COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ].join("\r\n");
}
