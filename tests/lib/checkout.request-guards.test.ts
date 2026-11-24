import { describe, expect, it } from "vitest";
import {
  allowedCheckoutOrigins,
  checkCheckoutOrigin,
  checkJsonContentType,
} from "../../lib/checkout/requestGuards";

/**
 * Coverage for the CSRF/origin guard on the checkout mutation routes (#326).
 *
 * The routes are exercised through the guard functions rather than through a
 * running server: the project's route handlers pull in Firebase Admin and the
 * Stellar SDK at import time, which needs live credentials. The guard is the
 * unit that decides accept/reject, so testing it directly is the honest level.
 */

const ENV = {
  CHECKOUT_ALLOWED_ORIGINS: "https://shop.example.com, https://preview.example.com",
  NEXT_PUBLIC_APP_URL: "https://shop.example.com",
} as NodeJS.ProcessEnv;

function post(headers: Record<string, string>, body = "{}") {
  return new Request("https://shop.example.com/api/checkout/quote", {
    method: "POST",
    headers,
    body,
  });
}

describe("allowedCheckoutOrigins", () => {
  it("reads the comma-separated list and normalises each entry", () => {
    expect(
      allowedCheckoutOrigins({ CHECKOUT_ALLOWED_ORIGINS: "https://a.test,https://b.test/" })
    ).toEqual(["https://a.test", "https://b.test"]);
  });

  it("falls back to NEXT_PUBLIC_APP_URL when the list is unset", () => {
    expect(allowedCheckoutOrigins({ NEXT_PUBLIC_APP_URL: "https://only.test" })).toEqual([
      "https://only.test",
    ]);
  });

  it("does not duplicate an origin present in both settings", () => {
    const list = allowedCheckoutOrigins({
      CHECKOUT_ALLOWED_ORIGINS: "https://shop.example.com",
      NEXT_PUBLIC_APP_URL: "https://shop.example.com",
    });
    expect(list).toEqual(["https://shop.example.com"]);
  });

  it("uses loopback defaults so local development keeps working", () => {
    const list = allowedCheckoutOrigins({} as NodeJS.ProcessEnv);
    expect(list).toContain("http://localhost:3000");
  });
});

describe("checkCheckoutOrigin", () => {
  it("rejects a request with no Origin header", () => {
    const result = checkCheckoutOrigin(post({}), ENV);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toMatch(/must come from the storefront/i);
    }
  });

  it("accepts a trusted origin", () => {
    const result = checkCheckoutOrigin(post({ origin: "https://shop.example.com" }), ENV);
    expect(result).toEqual({ ok: true, origin: "https://shop.example.com" });
  });

  it("accepts a second configured origin", () => {
    const result = checkCheckoutOrigin(post({ origin: "https://preview.example.com" }), ENV);
    expect(result.ok).toBe(true);
  });

  it("rejects a hostile origin", () => {
    const result = checkCheckoutOrigin(post({ origin: "https://evil.test" }), ENV);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toMatch(/untrusted origin/i);
    }
  });

  it("rejects a look-alike host that merely starts with an allowed one", () => {
    const result = checkCheckoutOrigin(
      post({ origin: "https://shop.example.com.evil.test" }),
      ENV
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a mismatched scheme on an allowed host", () => {
    const result = checkCheckoutOrigin(post({ origin: "http://shop.example.com" }), ENV);
    expect(result.ok).toBe(false);
  });

  it("rejects a mismatched port on an allowed host", () => {
    const result = checkCheckoutOrigin(post({ origin: "https://shop.example.com:8443" }), ENV);
    expect(result.ok).toBe(false);
  });

  it("rejects the literal null origin used by sandboxed frames", () => {
    const result = checkCheckoutOrigin(post({ origin: "null" }), ENV);
    expect(result.ok).toBe(false);
  });

  it("rejects an unparseable origin", () => {
    const result = checkCheckoutOrigin(post({ origin: "not a url" }), ENV);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid origin/i);
    }
  });
});

describe("checkJsonContentType", () => {
  it("accepts application/json", () => {
    expect(checkJsonContentType(post({ "content-type": "application/json" })).ok).toBe(true);
  });

  it("accepts application/json with a charset parameter", () => {
    expect(
      checkJsonContentType(post({ "content-type": "application/json; charset=utf-8" })).ok
    ).toBe(true);
  });

  it("rejects a form-encoded body, the simplest CSRF shape", () => {
    const result = checkJsonContentType(
      post({ "content-type": "application/x-www-form-urlencoded" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(415);
  });

  it("rejects multipart and text/plain bodies", () => {
    expect(checkJsonContentType(post({ "content-type": "multipart/form-data" })).ok).toBe(false);
    expect(checkJsonContentType(post({ "content-type": "text/plain" })).ok).toBe(false);
  });

  it("rejects a missing content type", () => {
    expect(checkJsonContentType(post({})).ok).toBe(false);
  });
});
