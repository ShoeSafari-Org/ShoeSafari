import { describe, expect, it } from "vitest";
import { createCustomerOrderReference, isCustomerOrderReference } from "../../lib/orderReference";

describe("customer order references", () => {
  it("uses a stable date-prefixed display format", () => {
    const reference = createCustomerOrderReference(Date.UTC(2026, 0, 2), 35);
    expect(reference).toBe("SS-20260102-00000Z");
    expect(isCustomerOrderReference(reference)).toBe(true);
  });

  it("rejects hashes and malformed references", () => {
    expect(isCustomerOrderReference("a".repeat(64))).toBe(false);
    expect(isCustomerOrderReference("SS-20260102-123")).toBe(false);
  });
});
