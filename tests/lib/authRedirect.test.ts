import { describe, expect, it } from "vitest";
import { getSafeLoginRedirect } from "../../lib/authRedirect";

describe("getSafeLoginRedirect", () => {
  it("keeps safe same-origin destinations, including order redirects", () => {
    expect(getSafeLoginRedirect("/orders")).toBe("/orders");
    expect(getSafeLoginRedirect("/shop?category=boots#results")).toBe(
      "/shop?category=boots#results"
    );
    expect(getSafeLoginRedirect("/profile/settings")).toBe("/profile/settings");
  });

  it.each([
    null,
    "",
    "shop",
    "https://attacker.example/",
    "//attacker.example/",
    "/\\attacker.example/",
    "/%2f%2fattacker.example/",
    "/%252f%252fattacker.example/",
    "/%5c%5cattacker.example/",
    "/bad%escape",
    "/orders%0d%0aLocation:%20https://attacker.example/",
  ])("falls back to /shop for unsafe redirect %s", (redirect) => {
    expect(getSafeLoginRedirect(redirect)).toBe("/shop");
  });
});
