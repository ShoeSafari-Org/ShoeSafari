/** Normalize legacy single-string addresses and structured addresses uniformly. */
export function normalizeShippingAddress(value) {
  if (typeof value === "string") {
    return {
      addressLine1: value.trim(),
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
    };
  }
  const address = value && typeof value === "object" ? value : {};
  return {
    addressLine1:
      typeof address.addressLine1 === "string" ? address.addressLine1.trim() : "",
    addressLine2:
      typeof address.addressLine2 === "string" ? address.addressLine2.trim() : "",
    city: typeof address.city === "string" ? address.city.trim() : "",
    region: typeof address.region === "string" ? address.region.trim() : "",
    postalCode: typeof address.postalCode === "string" ? address.postalCode.trim() : "",
    country: typeof address.country === "string" ? address.country.trim() : "",
  };
}

export function isShippingAddressComplete(value) {
  const address = normalizeShippingAddress(value);
  return Boolean(
    address.addressLine1 &&
      address.city &&
      address.region &&
      address.postalCode &&
      address.country
  );
}

export function formatShippingAddress(value) {
  const address = normalizeShippingAddress(value);
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}
