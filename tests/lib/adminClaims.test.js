import { describe, expect, it } from "vitest";
import { hasAdminClaim } from "../../lib/adminClaims";

describe("hasAdminClaim", () => {
  it("accepts only a boolean admin custom claim", () => {
    expect(hasAdminClaim({ admin: true })).toBe(true);
    expect(hasAdminClaim({ admin: false })).toBe(false);
    expect(hasAdminClaim({ admin: "true" })).toBe(false);
    expect(hasAdminClaim({ email: "admin@example.com" })).toBe(false);
    expect(hasAdminClaim(null)).toBe(false);
  });
});
