import { NETWORK, RPC_URL } from "./config";

export type RpcOperation = "read" | "simulate" | "send" | "poll";
export type RpcOutcome = "success" | "failure";

export interface RpcHealthObservation {
  operation: RpcOperation;
  network: "testnet" | "mainnet";
  endpoint: string;
  outcome: RpcOutcome;
  errorClass?: string;
  durationMs: number;
}

export interface RpcHealthSnapshot extends Omit<RpcHealthObservation, "durationMs"> {
  count: number;
  totalDurationMs: number;
  lastDurationMs: number;
}

const observations = new Map<string, RpcHealthSnapshot>();
const endpointLabel = (() => {
  try {
    return new URL(RPC_URL).host;
  } catch {
    return "invalid-endpoint";
  }
})();

function key(observation: RpcHealthObservation): string {
  return [
    observation.operation,
    observation.network,
    observation.endpoint,
    observation.outcome,
    observation.errorClass ?? "none",
  ].join("|");
}

export function classifyRpcError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|timed out|deadline/i.test(message)) return "timeout";
  if (/429|rate limit|too many requests/i.test(message)) return "rate_limited";
  if (/network|fetch|econn|socket|dns|offline/i.test(message)) return "network";
  if (/simulation|hosterror|contract/i.test(message)) return "simulation";
  if (/401|403|unauthori[sz]ed/i.test(message)) return "authorization";
  return "unknown";
}

/** Record bounded endpoint/network labels only; never include URLs with query secrets or RPC payloads. */
export function recordRpcHealth(
  operation: RpcOperation,
  outcome: RpcOutcome,
  durationMs: number,
  error?: unknown
): void {
  const safeDuration = Number.isFinite(durationMs) && durationMs >= 0 ? Math.round(durationMs) : 0;
  const observation: RpcHealthObservation = {
    operation,
    network: NETWORK,
    endpoint: endpointLabel,
    outcome,
    ...(outcome === "failure" ? { errorClass: classifyRpcError(error) } : {}),
    durationMs: safeDuration,
  };
  const existing = observations.get(key(observation));
  observations.set(key(observation), {
    operation,
    network: NETWORK,
    endpoint: endpointLabel,
    outcome,
    ...(observation.errorClass ? { errorClass: observation.errorClass } : {}),
    count: (existing?.count ?? 0) + 1,
    totalDurationMs: (existing?.totalDurationMs ?? 0) + safeDuration,
    lastDurationMs: safeDuration,
  });
}

export function getRpcHealthSnapshot(): RpcHealthSnapshot[] {
  return [...observations.values()].map((observation) => ({ ...observation }));
}

export function resetRpcHealth(): void {
  observations.clear();
}

