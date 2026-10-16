import { describe, expect, it } from "vitest";
import { parseError } from "../../lib/errors";
import { WalletError } from "../../lib/stellar/freighter";

const TX_HASH = "a".repeat(64);

describe("parseError", () => {
  it("maps wallet and network failures to stable actionable errors", () => {
    expect(parseError(new WalletError("wallet is missing", "FREIGHTER_NOT_FOUND"))).toMatchObject({
      code: "WALLET_NOT_INSTALLED",
      userMessage: expect.stringContaining("Freighter"),
    });
    expect(parseError(new WalletError("wrong chain", "WRONG_NETWORK"))).toMatchObject({
      code: "WALLET_WRONG_NETWORK",
      userMessage: expect.stringContaining("switch"),
    });
    expect(parseError(new WalletError("RPC unavailable", "RPC_UNAVAILABLE"))).toMatchObject({
      code: "RPC_UNAVAILABLE",
      userMessage: expect.stringContaining("Stellar network"),
    });
    expect(
      parseError(new WalletError("invalid network config", "NETWORK_CONFIG_ERROR"))
    ).toMatchObject({
      code: "STELLAR_CONFIG_INVALID",
      recoverable: false,
    });
  });

  it("maps simulation and transaction rejection failures distinctly", () => {
    expect(parseError(new WalletError("simulation detail", "TX_SIMULATION_ERROR"))).toMatchObject({
      code: "TX_SIMULATION_FAILED",
    });
    expect(parseError(new WalletError("rejected detail", "TX_SEND_ERROR", TX_HASH))).toMatchObject({
      code: "TX_REJECTED",
      transactionHash: TX_HASH,
    });
  });

  it("preserves a hash when confirmation times out or fails", () => {
    const timeout = parseError(
      new WalletError("confirmation timed out", "TX_CONFIRMATION_TIMEOUT", TX_HASH)
    );
    const failed = parseError(
      new WalletError("transaction failed on ledger", "TX_FAILED", TX_HASH)
    );

    expect(timeout).toMatchObject({
      code: "TX_TIMEOUT",
      transactionHash: TX_HASH,
    });
    expect(failed).toMatchObject({
      code: "TX_FAILED",
      transactionHash: TX_HASH,
    });
  });

  it("keeps unknown failure details diagnostic without exposing them to users", () => {
    const error = parseError(new Error("private response body"));

    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.userMessage).not.toContain("private response body");
    expect(error.diagnosticMessage).toBe("private response body");
  });

  it("extracts a transaction hash embedded in confirmation details", () => {
    const error = parseError(new Error(`timed out (hash: ${TX_HASH})`));

    expect(error.code).toBe("TX_TIMEOUT");
    expect(error.transactionHash).toBe(TX_HASH);
  });
});
