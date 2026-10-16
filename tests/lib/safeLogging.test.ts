import { afterEach, describe, expect, it, vi } from "vitest";
import { logClientError, safeErrorForLogging } from "../../lib/safeLogging";

const TX_HASH = "a".repeat(64);

describe("safe client error logging", () => {
  afterEach(() => vi.restoreAllMocks());

  it("redacts personal and payment details from native errors", () => {
    const error = new Error(
      `Checkout failed for jane@example.com, address: 12 Cedar Street; cardNumber: 4111111111111111; authorization: Bearer secret-value`
    );
    Object.assign(error, { code: "TX_SUBMISSION_FAILED", hash: TX_HASH });

    const safe = safeErrorForLogging(error);

    expect(safe).toMatchObject({
      name: "Error",
      code: "TX_SUBMISSION_FAILED",
      transactionHash: TX_HASH,
    });
    expect(safe.message).not.toContain("jane@example.com");
    expect(safe.message).not.toContain("12 Cedar Street");
    expect(safe.message).not.toContain("4111111111111111");
    expect(safe.message).not.toContain("secret-value");
  });

  it("handles SDK object errors while preserving safe codes and transaction hashes", () => {
    const safe = safeErrorForLogging({
      name: "AxiosError",
      message: "Request failed for email=buyer@example.com with token=private-token",
      code: "RPC_UNAVAILABLE",
      transactionHash: TX_HASH,
      response: { data: { accessToken: "nested-private-value" } },
    });

    expect(safe).toMatchObject({
      name: "AxiosError",
      code: "RPC_UNAVAILABLE",
      transactionHash: TX_HASH,
    });
    expect(safe.message).not.toContain("buyer@example.com");
    expect(safe.message).not.toContain("private-token");
    expect(JSON.stringify(safe)).not.toContain("nested-private-value");
  });

  it("extracts a transaction hash embedded in a plain error string", () => {
    const safe = safeErrorForLogging(`Transaction confirmation failed, hash: ${TX_HASH}`);

    expect(safe.transactionHash).toBe(TX_HASH);
    expect(safe.message).toContain(TX_HASH);
  });

  it("logs only the sanitized summary and retains a supplied recovery hash", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("Request failed for account@example.com"), {
      code: "TX_CONFIRMATION_TIMEOUT",
    });

    logClientError("Checkout persistence failed", error, TX_HASH);

    expect(consoleError).toHaveBeenCalledWith(
      "Checkout persistence failed",
      expect.objectContaining({
        code: "TX_CONFIRMATION_TIMEOUT",
        transactionHash: TX_HASH,
      })
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("account@example.com");
  });
});
