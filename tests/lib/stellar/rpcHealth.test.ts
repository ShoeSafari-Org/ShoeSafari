import {
  classifyRpcError,
  getRpcHealthSnapshot,
  recordRpcHealth,
  resetRpcHealth,
} from "../../../lib/stellar/rpcHealth";

describe("RPC health metrics", () => {
  beforeEach(() => resetRpcHealth());

  it("aggregates operation latency with network and endpoint labels", () => {
    recordRpcHealth("simulate", "success", 14.4);
    recordRpcHealth("simulate", "success", 9);

    expect(getRpcHealthSnapshot()).toMatchObject([
      expect.objectContaining({
        operation: "simulate",
        network: expect.any(String),
        endpoint: expect.any(String),
        outcome: "success",
        count: 2,
        totalDurationMs: 23,
        lastDurationMs: 9,
      }),
    ]);
  });

  it("classifies retryable failure families without retaining error text", () => {
    recordRpcHealth("poll", "failure", 3, new Error("RPC request timed out"));

    expect(classifyRpcError(new Error("429 rate limit"))).toBe("rate_limited");
    expect(getRpcHealthSnapshot()[0]).toMatchObject({
      operation: "poll",
      outcome: "failure",
      errorClass: "timeout",
    });
    expect(JSON.stringify(getRpcHealthSnapshot())).not.toContain("timed out");
  });
});
