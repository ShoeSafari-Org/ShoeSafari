export type CheckoutMetricStage =
  | "quote"
  | "readiness"
  | "simulation"
  | "signing"
  | "submission"
  | "confirmation"
  | "persistence";

export type CheckoutMetricOutcome = "success" | "failure";

export interface CheckoutMetricLabels {
  stage: CheckoutMetricStage;
  network: "testnet" | "mainnet" | "unknown";
  token: string;
  outcome: CheckoutMetricOutcome;
}

export interface CheckoutMetricSnapshot extends CheckoutMetricLabels {
  count: number;
  totalDurationMs: number;
  lastDurationMs: number;
}

const counters = new Map<string, CheckoutMetricSnapshot>();

function key(labels: CheckoutMetricLabels): string {
  return [labels.stage, labels.network, labels.token, labels.outcome].join("|");
}

/** Record only bounded labels and timing; never pass order IDs, addresses, or error text here. */
export function recordCheckoutMetric(labels: CheckoutMetricLabels, durationMs: number): void {
  const safeDuration = Number.isFinite(durationMs) && durationMs >= 0 ? Math.round(durationMs) : 0;
  const existing = counters.get(key(labels));
  counters.set(key(labels), {
    ...labels,
    count: (existing?.count ?? 0) + 1,
    totalDurationMs: (existing?.totalDurationMs ?? 0) + safeDuration,
    lastDurationMs: safeDuration,
  });
}

export function getCheckoutMetricSnapshot(): CheckoutMetricSnapshot[] {
  return [...counters.values()].map((metric) => ({ ...metric }));
}

/** Test-only reset; production callers should treat metrics as process-local telemetry. */
export function resetCheckoutMetrics(): void {
  counters.clear();
}

