import type { OrderDetails, OrderStatus } from "./orders";

export interface StoredCustomerOrder {
  orderIdHash?: string;
  buyerWallet?: string | null;
  tokenContract?: string | null;
  amountRaw?: string | null;
  verifiedStatus?: OrderStatus;
  verifiedAt?: number;
}

/** Apply status only when the simulated contract read matches this order's terms. */
export function applyVerifiedOrderRead<T extends StoredCustomerOrder>(
  storedOrder: T,
  contractOrder: OrderDetails,
  checkedAt: number
): T {
  const savedHash = storedOrder.orderIdHash?.replace(/^0x/i, "").toLowerCase();
  const chainHash = contractOrder.orderIdHash?.replace(/^0x/i, "").toLowerCase();
  if (!savedHash || savedHash !== chainHash || contractOrder.status === "Unknown") {
    return storedOrder;
  }
  if (storedOrder.buyerWallet && storedOrder.buyerWallet !== contractOrder.buyer) return storedOrder;
  if (storedOrder.tokenContract && storedOrder.tokenContract !== contractOrder.token) return storedOrder;
  if (storedOrder.amountRaw && BigInt(storedOrder.amountRaw) !== contractOrder.amount) return storedOrder;

  const previous = storedOrder.verifiedStatus;
  if (previous === "Shipped" || previous === "Refunded") return storedOrder;
  if (previous === "Paid" && contractOrder.status === "Pending") return storedOrder;

  return { ...storedOrder, verifiedStatus: contractOrder.status, verifiedAt: checkedAt };
}
