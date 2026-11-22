// Accept the previous SS-prefixed references while new checkouts use the
// stable date/suffix format emitted by createCustomerOrderReference.
const CUSTOMER_REFERENCE_PATTERN = /^SS-[A-Za-z0-9_-]{1,128}$/;

export function createCustomerOrderReference(now = Date.now(), random = Math.floor(Math.random() * 36 ** 6)) {
  const date = new Date(now).toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.max(0, random).toString(36).toUpperCase().padStart(6, "0").slice(-6);
  return `SS-${date}-${suffix}`;
}

export function isCustomerOrderReference(value) {
  return typeof value === "string" && CUSTOMER_REFERENCE_PATTERN.test(value);
}
