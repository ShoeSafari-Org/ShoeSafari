import {
  getCheckoutMetricSnapshot,
  recordCheckoutMetric,
  resetCheckoutMetrics,
} from "../../../lib/stellar/checkoutMetrics";

describe("checkout lifecycle metrics", () => {
  beforeEach(() => resetCheckoutMetrics());

  it("aggregates bounded stage, network, token, outcome labels and durations", () => {
    recordCheckoutMetric(
      { stage: "simulation", network: "testnet", token: "USDC", outcome: "success" },
      12.7
    );
    recordCheckoutMetric(
      { stage: "simulation", network: "testnet", token: "USDC", outcome: "success" },
      8
    );

    expect(getCheckoutMetricSnapshot()).toEqual([
      {
        stage: "simulation",
        network: "testnet",
        token: "USDC",
        outcome: "success",
        count: 2,
        totalDurationMs: 21,
        lastDurationMs: 8,
      },
    ]);
  });

  it("keeps failure metrics separate and sanitizes invalid durations", () => {
    recordCheckoutMetric(
      { stage: "submission", network: "mainnet", token: "XLM", outcome: "failure" },
      Number.NaN
    );

    expect(getCheckoutMetricSnapshot()[0]).toMatchObject({
      stage: "submission",
      network: "mainnet",
      token: "XLM",
      outcome: "failure",
      count: 1,
      totalDurationMs: 0,
      lastDurationMs: 0,
    });
  });
});
