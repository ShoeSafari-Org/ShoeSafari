/**
 * Availability rule for Firestore product records: only an explicit `false`
 * marks a product unavailable. Records written before this field existed stay
 * purchasable until an administrator deliberately disables them.
 */
export function isProductAvailable(product: unknown): boolean {
  return (
    Boolean(product) &&
    typeof product === "object" &&
    (product as { available?: unknown }).available !== false
  );
}
