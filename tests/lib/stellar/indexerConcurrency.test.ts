import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentEventIndexer } from "../../../lib/stellar/indexer";

type Callbacks = {
  onEvent: ReturnType<typeof vi.fn>;
  onStatus: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
};

function makeCallbacks(): Callbacks {
  return { onEvent: vi.fn(), onStatus: vi.fn(), onError: vi.fn() };
}

/**
 * Deferred promise helper so a test can keep a `getEvents` request "in flight"
 * and resolve/reject it at a chosen moment.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function emptyResponse(cursor: string, latestLedger = 100) {
  return { latestLedger, cursor, events: [] } as never;
}

describe("PaymentEventIndexer poll concurrency guard", () => {
  let indexer: PaymentEventIndexer;

  beforeEach(() => {
    indexer = new PaymentEventIndexer({ rpcUrl: "https://example.test" });
    // Put the indexer in a state where `poll` can issue a `getEvents` request.
    (indexer as any).running = true;
    (indexer as any).startLedger = 1;
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("does not issue a concurrent getEvents while a slow request is in flight", async () => {
    const pending = deferred<never>();
    const getEvents = vi.fn().mockReturnValueOnce(pending.promise);
    (indexer as any).server.getEvents = getEvents;

    const callbacks = makeCallbacks();

    // First tick starts a request that never resolves yet.
    const first = (indexer as any).poll(callbacks, (indexer as any).generation) as Promise<void>;
    // Second tick fires while the first is still awaiting the RPC response.
    const second = (indexer as any).poll(callbacks, (indexer as any).generation) as Promise<void>;

    // The overlapping tick is a no-op and resolves immediately.
    await second;

    expect(getEvents).toHaveBeenCalledTimes(1);
    // The cursor must not advance from an incomplete response.
    expect((indexer as any).cursor).toBeUndefined();

    // Completing the in-flight request advances the cursor and clears the flag.
    pending.resolve(emptyResponse("cursor-after-slow") as never);
    await first;

    expect((indexer as any).cursor).toBe("cursor-after-slow");
    expect((indexer as any).pollInFlight).toBe(false);
  });

  it("advances the cursor only once a delayed response completes", async () => {
    const pending = deferred<never>();
    const getEvents = vi.fn().mockReturnValueOnce(pending.promise);
    (indexer as any).server.getEvents = getEvents;

    const callbacks = makeCallbacks();
    const poll = (indexer as any).poll(callbacks, (indexer as any).generation) as Promise<void>;

    // Still mid-flight: no cursor update yet.
    expect((indexer as any).cursor).toBeUndefined();
    expect((indexer as any).pollInFlight).toBe(true);

    pending.resolve(emptyResponse("cursor-1") as never);
    await poll;

    expect((indexer as any).cursor).toBe("cursor-1");
  });

  it("clears the in-flight flag after a rejected request and polls again later", async () => {
    const getEvents = vi
      .fn()
      .mockRejectedValueOnce(new Error("rpc unavailable"))
      .mockResolvedValueOnce(emptyResponse("cursor-2", 101));
    (indexer as any).server.getEvents = getEvents;

    const callbacks = makeCallbacks();

    // First poll rejects; the error is handled and the flag is cleared.
    await (indexer as any).poll(callbacks, (indexer as any).generation);
    expect((indexer as any).pollInFlight).toBe(false);
    expect(callbacks.onError).toHaveBeenCalled();
    expect((indexer as any).cursor).toBeUndefined();

    // A later tick runs because the in-flight flag was reset in `finally`.
    await (indexer as any).poll(callbacks, (indexer as any).generation);

    expect(getEvents).toHaveBeenCalledTimes(2);
    expect((indexer as any).cursor).toBe("cursor-2");
  });

  it("skips overlapping ticks scheduled by setInterval", async () => {
    vi.useFakeTimers();
    try {
      const pending = deferred<never>();
      // Latest-ledger lookup during initialize resolves instantly; the first
      // getEvents stays in flight so scheduled ticks have to skip.
      (indexer as any).server.getLatestLedger = vi
        .fn()
        .mockResolvedValue({ sequence: 100 });
      const getEvents = vi.fn().mockReturnValue(pending.promise);
      (indexer as any).server.getEvents = getEvents;

      // Fresh indexer driven through the public start() scheduling path.
      const scheduled = new PaymentEventIndexer({
        rpcUrl: "https://example.test",
        pollMs: 10,
      });
      (scheduled as any).server.getLatestLedger = vi
        .fn()
        .mockResolvedValue({ sequence: 100 });
      (scheduled as any).server.getEvents = getEvents;

      scheduled.start(makeCallbacks());

      // Let initialize() resolve its awaited getLatestLedger.
      await vi.advanceTimersByTimeAsync(0);
      // Advance well past several poll intervals while the first request hangs.
      await vi.advanceTimersByTimeAsync(50);

      // Despite many ticks, only the first request was issued.
      expect(getEvents).toHaveBeenCalledTimes(1);

      scheduled.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
