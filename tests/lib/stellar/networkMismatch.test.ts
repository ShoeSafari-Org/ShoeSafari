import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

const TEST_PUBKEY = "G" + "A".repeat(55);
const TEST_CONTRACT = "C" + "A".repeat(55);

/** Re-import stellar modules with a fresh registry under stubbed env. */
async function loadModules(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const freighterApi = await import("@stellar/freighter-api");
  const config = await import("../../../lib/stellar/config");
  const freighter = await import("../../../lib/stellar/freighter");
  const checkout = await import("../../../lib/stellar/checkout");
  return { freighterApi, config, freighter, checkout };
}

function mockNetwork(
  freighterApi: Awaited<ReturnType<typeof loadModules>>["freighterApi"],
  network: string,
) {
  vi.mocked(freighterApi.getNetwork).mockResolvedValue({
    network,
    networkPassphrase: "",
  });
}

describe("ensureNetwork", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows a wallet on the configured testnet network to proceed", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    mockNetwork(freighterApi, "TESTNET");
    await expect(freighter.ensureNetwork()).resolves.toBe("TESTNET");
  });

  it("allows a wallet on the configured mainnet network to proceed", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });
    mockNetwork(freighterApi, "PUBLIC");
    await expect(freighter.ensureNetwork()).resolves.toBe("PUBLIC");
  });

  it("rejects a wallet on a different network with an actionable message", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    mockNetwork(freighterApi, "PUBLIC");
    const err = await freighter
      .ensureNetwork()
      .catch((e: Error) => e);
    expect(err).toMatchObject({ name: "WalletError", code: "WRONG_NETWORK" });
    expect(err.message).toContain("testnet");
    expect(err.message).toContain("Switch your Freighter network");
  });

  it("rejects a testnet wallet when the store expects mainnet", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });
    mockNetwork(freighterApi, "TESTNET");
    await expect(freighter.ensureNetwork()).rejects.toMatchObject({
      name: "WalletError",
      code: "WRONG_NETWORK",
    });
  });

  it("fails closed when the Freighter API reports an error", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    vi.mocked(freighterApi.getNetwork).mockResolvedValue({
      network: "",
      networkPassphrase: "",
      error: { code: -1, message: "User denied access" },
    });
    await expect(freighter.ensureNetwork()).rejects.toMatchObject({
      name: "WalletError",
      code: "FREIGHTER_NETWORK_ERROR",
    });
  });

  it("fails closed when the Freighter API throws", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    vi.mocked(freighterApi.getNetwork).mockRejectedValue(
      new Error("extension not responding")
    );
    await expect(freighter.ensureNetwork()).rejects.toThrow(
      "extension not responding"
    );
  });

  it("fails closed on unsupported network values", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    mockNetwork(freighterApi, "STANDALONE");
    await expect(freighter.ensureNetwork()).rejects.toMatchObject({
      code: "WRONG_NETWORK",
    });
  });

  it("matches network names case-insensitively", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
    });
    mockNetwork(freighterApi, "testnet");
    await expect(freighter.ensureNetwork()).resolves.toBe("testnet");
  });

  it("rejects an unsupported raw network before calling Freighter", async () => {
    const { freighterApi, freighter } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "private-net",
    });

    await expect(freighter.ensureNetwork()).rejects.toMatchObject({
      name: "WalletError",
      code: "NETWORK_CONFIG_ERROR",
      message: expect.stringContaining("NEXT_PUBLIC_STELLAR_NETWORK"),
    });
    expect(freighterApi.getNetwork).not.toHaveBeenCalled();
  });

  it("rejects a mismatched raw passphrase before calling Freighter", async () => {
    const { freighterApi, freighter, config } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
      NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
      NEXT_PUBLIC_STELLAR_RPC_URL: "https://custom-rpc.example.test",
    });

    await expect(freighter.ensureNetwork()).rejects.toMatchObject({
      name: "WalletError",
      code: "NETWORK_CONFIG_ERROR",
      message: expect.stringContaining("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE"),
    });
    expect(freighterApi.getNetwork).not.toHaveBeenCalled();
    expect(config.RPC_URL).toBe("https://custom-rpc.example.test");
  });
});

describe("checkout network guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does not call signTransaction after a network mismatch", async () => {
    const { freighterApi, checkout } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_CHECKOUT_CONTRACT_ID: TEST_CONTRACT,
    });
    mockNetwork(freighterApi, "PUBLIC");

    await expect(
      checkout.payWithStellar({
        amountUsd: 10,
        orderId: "order-1",
        publicKey: TEST_PUBKEY,
        onStatus: () => {},
      })
    ).rejects.toMatchObject({ code: "WRONG_NETWORK" });

    expect(freighterApi.signTransaction).not.toHaveBeenCalled();
  });

  it("rejects before any signing when the Freighter API errors", async () => {
    const { freighterApi, checkout } = await loadModules({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_CHECKOUT_CONTRACT_ID: TEST_CONTRACT,
    });
    vi.mocked(freighterApi.getNetwork).mockResolvedValue({
      network: "",
      networkPassphrase: "",
      error: { code: -1, message: "User denied access" },
    });

    await expect(
      checkout.payWithStellar({
        amountUsd: 10,
        orderId: "order-1",
        publicKey: TEST_PUBKEY,
        onStatus: () => {},
      })
    ).rejects.toMatchObject({ code: "FREIGHTER_NETWORK_ERROR" });

    expect(freighterApi.signTransaction).not.toHaveBeenCalled();
  });
});
