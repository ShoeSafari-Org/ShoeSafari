import { describe, expect, it } from "vitest";
import { transactionExplorerUrl } from "../../../lib/stellar/explorer";

describe("transactionExplorerUrl", () => {
  it("uses the testnet explorer", () => {
    expect(transactionExplorerUrl("abc123", "testnet")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123",
    );
  });

  it("uses the public explorer for mainnet", () => {
    expect(transactionExplorerUrl("abc123", "mainnet")).toBe(
      "https://stellar.expert/explorer/public/tx/abc123",
    );
  });

  it("URL-encodes hashes before adding them to the path", () => {
    expect(transactionExplorerUrl("hash/with # unsafe chars", "testnet")).toBe(
      "https://stellar.expert/explorer/testnet/tx/hash%2Fwith%20%23%20unsafe%20chars",
    );
  });

  it.each(["", "   ", null, undefined])(
    "returns null for an empty hash (%s)",
    (hash) => {
      expect(transactionExplorerUrl(hash, "testnet")).toBeNull();
    },
  );
});
