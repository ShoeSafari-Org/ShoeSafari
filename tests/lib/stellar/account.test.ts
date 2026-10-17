import { afterEach, describe, expect, it, vi } from "vitest";
import { getTrustline, loadAccount } from "../../../lib/stellar/account";

const token = {
  isNative: false,
  assetCode: "USDC",
  assetIssuer: "G" + "A".repeat(55),
  symbol: "USDC",
  decimals: 7,
  contractId: "C" + "A".repeat(55),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("account readiness helpers", () => {
  it("reports an unfunded account with an actionable error category without calling Friendbot", async () => {
    const server = {
      getAccount: vi.fn().mockRejectedValue(new Error("not found")),
    } as never;

    await expect(loadAccount(server, "G" + "A".repeat(55), { fund: false })).rejects.toMatchObject({
      name: "WalletError",
      code: "ACCOUNT_NOT_FOUND",
      message: expect.stringContaining("Fund it with XLM"),
    });
  });

  it("classifies a missing asset trustline without treating it as an RPC failure", async () => {
    const server = {
      getAssetBalance: vi.fn().mockResolvedValue({ balanceEntry: null }),
    } as never;

    await expect(getTrustline(server, "G" + "A".repeat(55), token)).resolves.toEqual({
      hasTrustline: false,
      balanceRaw: 0n,
      authorized: false,
    });
  });

  it("returns a missing-trustline result when the RPC request fails", async () => {
    const server = {
      getAssetBalance: vi.fn().mockRejectedValue(new Error("offline")),
    } as never;

    await expect(getTrustline(server, "G" + "A".repeat(55), token)).resolves.toEqual({
      hasTrustline: false,
      balanceRaw: 0n,
      authorized: false,
    });
  });
});
