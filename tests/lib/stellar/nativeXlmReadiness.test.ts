import { beforeEach, describe, expect, it, vi } from "vitest";
import { NATIVE_ASSET_CONTRACT_ID, tokenForContract } from "../../../lib/stellar/config";
import { assertPaymentReady, MIN_NATIVE_RESERVE } from "../../../lib/stellar/account";
import type { rpc } from "@stellar/stellar-sdk";

const mocks = vi.hoisted(() => ({
  readTokenBalance: vi.fn(),
  readTokenDecimals: vi.fn(),
}));

vi.mock("../../../lib/stellar/simulate", () => ({
  readTokenBalance: mocks.readTokenBalance,
  readTokenDecimals: mocks.readTokenDecimals,
}));

describe("native XLM payment readiness", () => {
  beforeEach(() => {
    mocks.readTokenBalance.mockReset().mockResolvedValue(5_000_000n);
    mocks.readTokenDecimals.mockReset().mockResolvedValue(7);
  });

  it("blocks signing when the wallet XLM balance is below the quoted amount", async () => {
    const token = tokenForContract(NATIVE_ASSET_CONTRACT_ID)!;
    const server = {
      getAccount: vi.fn().mockResolvedValue({ sequenceNumber: () => "1" }),
      getAccountEntry: vi.fn().mockResolvedValue({ balance: () => String(MIN_NATIVE_RESERVE * 2n) }),
    } as unknown as rpc.Server;

    const readiness = await assertPaymentReady(server, "G-test-account", {
      token,
      requiredRaw: 10_000_000n,
      strict: false,
    });

    expect(readiness.sufficientBalance).toBe(false);
    expect(readiness.issues[0]).toMatch(/insufficient XLM balance/i);
  });
});
