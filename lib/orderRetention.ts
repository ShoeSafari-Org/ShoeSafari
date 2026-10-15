export const ORDER_PERSONAL_DATA_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

type OrderDate = number | Date | { toMillis?: () => number } | null | undefined;

export interface OrderRetentionRecord {
  status?: string;
  completedAt?: OrderDate;
  updatedAt?: OrderDate;
  personalDataAnonymizedAt?: unknown;
}

function timestampMillis(value: OrderDate): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }
  return null;
}

export function isOrderRetentionDue(
  order: OrderRetentionRecord | null | undefined,
  now = Date.now()
): boolean {
  if (!order || !["Shipped", "Refunded"].includes(order.status || "")) return false;
  if (order.personalDataAnonymizedAt) return false;

  const completedAt = timestampMillis(order.completedAt ?? order.updatedAt);
  return completedAt !== null && now >= completedAt + ORDER_PERSONAL_DATA_RETENTION_MS;
}

export function createOrderAnonymizationPatch(
  order: OrderRetentionRecord,
  options: { now?: number; customerRequest?: boolean } = {}
) {
  if (!["Shipped", "Refunded"].includes(order.status || "")) {
    throw new Error("Only completed orders can have customer data anonymized.");
  }
  if (order.personalDataAnonymizedAt) {
    throw new Error("Customer data has already been anonymized.");
  }
  if (!options.customerRequest && !isOrderRetentionDue(order, options.now)) {
    throw new Error("Customer data is retained for one year after order completion.");
  }

  const customer = {
    firstName: "",
    lastName: "",
    email: "",
    address: "",
  };

  return {
    userId: null,
    buyerWallet: null,
    customer,
  };
}
