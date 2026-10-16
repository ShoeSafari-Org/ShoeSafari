import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getLatestLedger, getEvents } = vi.hoisted(() => ({
  getLatestLedger: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: class {
      getLatestLedger = getLatestLedger;
      getEvents = getEvents;
    },
  },
  xdr: { ScValType: { scvSymbol: () => "symbol" } },
}));

vi.mock("../../../lib/stellar/config", () => ({
  CHECKOUT_CONTRACT_ID: "C-contract",
  EVENT_POLL_INTERVAL_MS: 1000,
  EVENT_START_LEDGER_BACKFILL: 100,
  RPC_URL: "https://rpc.example.test",
}));

import { PaymentEventIndexer } from "../../../lib/stellar/indexer";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushPromises() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

describe("PaymentEventIndexer cancellation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getLatestLedger.mockReset();
    getEvents.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not start polling when stopped during initialization", async () => {
    const latest = deferred<{ sequence: number }>();
    getLatestLedger.mockReturnValue(latest.promise);
    const onStatus = vi.fn();
    const indexer = new PaymentEventIndexer();

    indexer.start({ onEvent: vi.fn(), onStatus });
    indexer.stop();
    latest.resolve({ sequence: 100 });
    await Promise.resolve();
    await Promise.resolve();

    expect(indexer.status.running).toBe(false);
    expect(onStatus).not.toHaveBeenCalled();
    expect(getEvents).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a poll response that arrives after stop", async () => {
    const events = deferred<{ events: never[]; latestLedger: number }>();
    getLatestLedger.mockResolvedValue({ sequence: 100 });
    getEvents.mockReturnValue(events.promise);
    const onStatus = vi.fn();
    const indexer = new PaymentEventIndexer();

    indexer.start({ onEvent: vi.fn(), onStatus });
    await flushPromises();
    expect(getEvents).toHaveBeenCalledTimes(1);
    const statusCallsBeforeStop = onStatus.mock.calls.length;

    indexer.stop();
    events.resolve({ events: [], latestLedger: 101 });
    await flushPromises();

    expect(onStatus).toHaveBeenCalledTimes(statusCallsBeforeStop);
    expect(indexer.status.latestLedger).toBe(100);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resumes initialization and polling with the new callbacks after stop", async () => {
    getLatestLedger
      .mockResolvedValueOnce({ sequence: 100 })
      .mockResolvedValueOnce({ sequence: 200 });
    getEvents.mockResolvedValue({ events: [], latestLedger: 101 });
    const oldOnStatus = vi.fn();
    const newOnStatus = vi.fn();
    const indexer = new PaymentEventIndexer();

    indexer.start({ onEvent: vi.fn(), onStatus: oldOnStatus });
    await flushPromises();
    expect(getEvents).toHaveBeenCalledTimes(1);
    expect(oldOnStatus).toHaveBeenCalled();

    indexer.stop();
    const oldStatusCallsAtStop = oldOnStatus.mock.calls.length;
    indexer.start({ onEvent: vi.fn(), onStatus: newOnStatus });
    await flushPromises();

    expect(indexer.status.running).toBe(true);
    expect(getLatestLedger).toHaveBeenCalledTimes(2);
    expect(getEvents).toHaveBeenCalledTimes(2);
    expect(newOnStatus).toHaveBeenCalled();
    expect(oldOnStatus).toHaveBeenCalledTimes(oldStatusCallsAtStop);
  });
});
