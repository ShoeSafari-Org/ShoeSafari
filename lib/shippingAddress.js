/** Normalize legacy single-string addresses and structured addresses uniformly. */
export const SUPPORTED_COUNTRIES = ["Canada", "Ghana", "Nigeria", "United Kingdom", "United States"];
const COUNTRY_ALIASES = new Map([
  ["ca", "Canada"], ["canada", "Canada"], ["gh", "Ghana"], ["ghana", "Ghana"],
  ["ng", "Nigeria"], ["nigeria", "Nigeria"], ["gb", "United Kingdom"],
  ["uk", "United Kingdom"], ["united kingdom", "United Kingdom"], ["us", "United States"],
  ["usa", "United States"], ["united states", "United States"],
]);
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
    country: typeof address.country === "string"
      ? COUNTRY_ALIASES.get(address.country.trim().toLocaleLowerCase()) || address.country.trim()
      : "",
  };
}

export function validateShippingAddress(value) {
  const address = normalizeShippingAddress(value);
  const errors = {};
  for (const field of ["addressLine1", "city", "region", "postalCode", "country"]) {
    if (!address[field]) errors[field] = "Required.";
  }
  if (address.country && !SUPPORTED_COUNTRIES.includes(address.country)) {
    errors.country = "This country is not supported for delivery yet.";
  }
  if (address.country === "United States" && address.postalCode && !/^\d{5}(?:-\d{4})?$/.test(address.postalCode)) {
    errors.postalCode = "Use a 5-digit ZIP code, optionally followed by 4 digits.";
  }
  if (address.country === "United Kingdom" && address.postalCode && !/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(address.postalCode)) {
    errors.postalCode = "Use a valid UK postcode.";
  }
  if ((address.country === "Canada" || address.country === "Ghana") && address.postalCode && !/^[A-Z0-9 -]{3,10}$/i.test(address.postalCode)) {
    errors.postalCode = "Use a valid postal code.";
  }
  return { isValid: Object.keys(errors).length === 0, errors, address };
}

export function isShippingAddressComplete(value) {
  return validateShippingAddress(value).isValid;
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
