import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Address, Keypair, xdr } from "@stellar/stellar-sdk";
import { i128ToScVal } from "../../../lib/stellar/scval";

// A read-only order lookup must never touch the network beyond a single
// simulation call. We mock the RPC Server so no HTTP request is made, and so
// the test fails loudly if the code ever reaches for account funding/lookup
// (the mock server only exposes `simulateTransaction`).
const { simulateTransaction } = vi.hoisted(() => ({
  simulateTransaction: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importActual) => {
  const actual = await importActual<typeof import("@stellar/stellar-sdk")>();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: vi.fn().mockImplementation(() => ({ simulateTransaction })),
    },
  };
});

// A valid deployed-contract strkey so `new Contract(id)` is accepted.
const CHECKOUT_CONTRACT_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
// Native XLM SAC on testnet (so the decoded token resolves to a known symbol).
const TOKEN_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const BUYER = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7)).publicKey();

/** Load `readOrder` with the checkout contract id stubbed into the env. */
async function loadOrders() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", CHECKOUT_CONTRACT_ID);
  return import("../../../lib/stellar/orders");
}

/** Build a successful simulation response carrying `Some(Order)` as a map. */
function orderSimulation(opts?: { amount?: bigint; timestamp?: bigint; status?: string }) {
  const amount = opts?.amount ?? 2500000n;
  const timestamp = opts?.timestamp ?? 1700000000n;
  const status = opts?.status ?? "Paid";

  const retval = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("buyer"),
      val: new Address(BUYER).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount"),
      val: i128ToScVal(amount),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("token"),
      val: new Address(TOKEN_CONTRACT_ID).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("timestamp"),
      val: xdr.ScVal.scvU64(new xdr.Uint64(timestamp)),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("status"),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(status)]),
    }),
  ]);

  // Minimal shape consumed by rpc.Api.isSimulationSuccess (`transactionData`).
  return { transactionData: {}, result: { retval }, _parsed: true };
}

describe("readOrder", () => {
  beforeEach(() => {
    simulateTransaction.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("decodes a found order from a read-only simulation", async () => {
    simulateTransaction.mockResolvedValue(orderSimulation());
    const { readOrder, READ_ONLY_SOURCE_ACCOUNT } = await loadOrders();

    const result = await readOrder("order-123");

    expect(result.kind).toBe("found");
    if (result.kind !== "found") throw new Error("expected found");
    expect(result.order.buyer).toBe(BUYER);
    expect(result.order.amount).toBe(2500000n);
    expect(result.order.token).toBe(TOKEN_CONTRACT_ID);
    expect(result.order.timestamp).toBe(1700000000);
    expect(result.order.status).toBe("Paid");
    expect(result.order.tokenSymbol).toBe("XLM");
    expect(result.order.amountDisplay).toBe("0.25");

    // Exactly one simulation; no account funding/lookup path was taken.
    expect(simulateTransaction).toHaveBeenCalledTimes(1);
    const tx = simulateTransaction.mock.calls[0][0];
    expect(tx.source).toBe(READ_ONLY_SOURCE_ACCOUNT);
  });

  it("returns not-found when the contract has no such order (void)", async () => {
    simulateTransaction.mockResolvedValue({
      transactionData: {},
      result: { retval: xdr.ScVal.scvVoid() },
      _parsed: true,
    });
    const { readOrder } = await loadOrders();

    const result = await readOrder("missing-order");

    expect(result).toEqual({ kind: "not-found" });
    expect(simulateTransaction).toHaveBeenCalledTimes(1);
  });

  it("returns not-found for an explicitly empty option (empty vec)", async () => {
    simulateTransaction.mockResolvedValue({
      transactionData: {},
      result: { retval: xdr.ScVal.scvVec([]) },
      _parsed: true,
    });
    const { readOrder } = await loadOrders();

    const result = await readOrder("missing-order");

    expect(result).toEqual({ kind: "not-found" });
  });

  it("surfaces malformed successful data as a typed decode error", async () => {
    simulateTransaction.mockResolvedValue({
      transactionData: {},
      result: { retval: xdr.ScVal.scvSymbol("unexpected") },
      _parsed: true,
    });
    const { readOrder, OrderReadError } = await loadOrders();

    const result = await readOrder("order-123");

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.error).toBeInstanceOf(OrderReadError);
    expect(result.error.code).toBe("DECODE_FAILED");
  });

  it("surfaces a transport/RPC failure as a typed RPC_ERROR", async () => {
    simulateTransaction.mockRejectedValue(new Error("fetch failed"));
    const { readOrder, OrderReadError } = await loadOrders();

    const result = await readOrder("order-123");

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.error).toBeInstanceOf(OrderReadError);
    expect(result.error.code).toBe("RPC_ERROR");
  });

  it("surfaces a simulation error distinctly from a missing order", async () => {
    simulateTransaction.mockResolvedValue({ error: "HostError: contract trapped" });
    const { readOrder, OrderReadError } = await loadOrders();

    const result = await readOrder("order-123");

    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.error).toBeInstanceOf(OrderReadError);
    expect(result.error.code).toBe("SIMULATION_FAILED");
  });
});
