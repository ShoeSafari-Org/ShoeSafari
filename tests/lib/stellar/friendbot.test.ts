import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Networks, rpc } from "@stellar/stellar-sdk";

const TEST_PUBKEY = "G" + "A".repeat(55);

/** Re-import config/account with a fresh module registry under stubbed env. */
async function loadModules(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const config = await import("../../lib/stellar/config");
  const account = await import("../../lib/stellar/account");
  return { config, account };
}

describe("isFriendbotAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows friendbot on testnet with default passphrase", async () => {
    const { config } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    expect(config.isFriendbotAllowed()).toBe(true);
  });

  it("blocks friendbot on mainnet", async () => {
    const { config } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });
    expect(config.isFriendbotAllowed()).toBe(false);
  });

  it("fails closed on unknown network values", async () => {
    const { config } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "staging",
    });
    expect(config.isFriendbotAllowed()).toBe(false);
  });

  it("fails closed when passphrase does not match testnet", async () => {
    const { config } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: Networks.PUBLIC,
    });
    expect(config.isFriendbotAllowed()).toBe(false);
  });

  it("fails closed on mainnet network with testnet passphrase", async () => {
    const { config } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
      NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: Networks.TESTNET,
    });
    expect(config.isFriendbotAllowed()).toBe(false);
  });
});

describe("fundTestnetAccount", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("calls the friendbot URL on testnet", async () => {
    const { config, account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    await account.fundTestnetAccount(TEST_PUBKEY);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith(config.FRIENDBOT_URL)).toBe(true);
    expect(url).toContain(`addr=${encodeURIComponent(TEST_PUBKEY)}`);
  });

  it("never calls the friendbot URL on mainnet", async () => {
    const { account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });
    await expect(account.fundTestnetAccount(TEST_PUBKEY)).rejects.toMatchObject({
      name: "WalletError",
      code: "FRIENDBOT_UNAVAILABLE",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never calls the friendbot URL on unknown networks", async () => {
    const { account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "staging",
    });
    await expect(account.fundTestnetAccount(TEST_PUBKEY)).rejects.toMatchObject({
      code: "FRIENDBOT_UNAVAILABLE",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never calls the friendbot URL on passphrase mismatch", async () => {
    const { account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: Networks.PUBLIC,
    });
    await expect(account.fundTestnetAccount(TEST_PUBKEY)).rejects.toMatchObject({
      code: "FRIENDBOT_UNAVAILABLE",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains to the user why funding is unavailable", async () => {
    const { account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });
    const err = await account.fundTestnetAccount(TEST_PUBKEY).catch((e: Error) => e);
    expect(err.message).toContain("testnet");
  });
});

describe("loadAccount friendbot guard", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function missingAccountServer() {
    return {
      getAccount: vi.fn().mockRejectedValue(new Error("account not found")),
    } as unknown as rpc.Server;
  }

  it("does not fund on mainnet and reports the account as missing", async () => {
    const { account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });
    await expect(account.loadAccount(missingAccountServer(), TEST_PUBKEY)).rejects.toMatchObject({
      code: "ACCOUNT_NOT_FOUND",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fund on unknown networks (fail closed)", async () => {
    const { account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "staging",
    });
    await expect(account.loadAccount(missingAccountServer(), TEST_PUBKEY)).rejects.toMatchObject({
      code: "ACCOUNT_NOT_FOUND",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("funds via friendbot on testnet", async () => {
    const { account } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    const fakeAccount = { accountId: () => TEST_PUBKEY };
    const server = {
      getAccount: vi
        .fn()
        .mockRejectedValueOnce(new Error("account not found"))
        .mockResolvedValueOnce(fakeAccount),
    } as unknown as rpc.Server;
    const loaded = await account.loadAccount(server, TEST_PUBKEY);
    expect(loaded.funded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
