import { describe, expect, it } from "vitest";
import {
  formatShippingAddress,
  isShippingAddressComplete,
  normalizeShippingAddress,
} from "../../lib/shippingAddress";

describe("shipping address compatibility", () => {
  it("converts legacy string addresses and preserves them for display", () => {
    const legacy = normalizeShippingAddress("  1 Example Street  ");
    expect(legacy.addressLine1).toBe("1 Example Street");
    expect(formatShippingAddress("1 Example Street")).toBe("1 Example Street");
    expect(isShippingAddressComplete("1 Example Street")).toBe(false);
  });

  it("requires the structured delivery fields", () => {
    const address = {
      addressLine1: "1 Example Street",
      addressLine2: "",
      city: "London",
      region: "Greater London",
      postalCode: "SW1A 1AA",
      country: "United Kingdom",
    };
    expect(isShippingAddressComplete(address)).toBe(true);
    expect(isShippingAddressComplete({ ...address, postalCode: " " })).toBe(false);
    expect(formatShippingAddress(address)).toBe("1 Example Street, London, Greater London, SW1A 1AA, United Kingdom");
  });
});
