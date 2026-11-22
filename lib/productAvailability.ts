export interface ProductInventory {
  available?: unknown;
  stockQuantity?: unknown;
  reservedQuantity?: unknown;
  reservationExpiresAt?: unknown;
}

/** Return stock left after reservations, while treating expired reservations as released. */
export function getAvailableQuantity(product: unknown, now = Date.now()): number {
  if (!product || typeof product !== "object") return 0;
  const inventory = product as ProductInventory;
  if (inventory.stockQuantity === undefined) return Number.POSITIVE_INFINITY;
  if (typeof inventory.stockQuantity !== "number" || !Number.isSafeInteger(inventory.stockQuantity) || inventory.stockQuantity < 0) return 0;

  const reservationExpiry = Number(inventory.reservationExpiresAt);
  const reserved =
    Number.isFinite(reservationExpiry) && reservationExpiry <= now
      ? 0
      : typeof inventory.reservedQuantity === "number" && Number.isSafeInteger(inventory.reservedQuantity) && inventory.reservedQuantity > 0
        ? inventory.reservedQuantity
        : 0;
  return Math.max(0, inventory.stockQuantity - reserved);
}

export function canReserveQuantity(product: unknown, quantity: number, now = Date.now()): boolean {
  return Number.isInteger(quantity) && quantity > 0 && getAvailableQuantity(product, now) >= quantity;
}

/** Legacy records without inventory fields remain available until migrated. */
export function isProductAvailable(product: unknown, now = Date.now()): boolean {
  return Boolean(product) && typeof product === "object" &&
    (product as ProductInventory).available !== false &&
    getAvailableQuantity(product, now) > 0;
}
