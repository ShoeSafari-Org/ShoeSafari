import { rpc, xdr } from "@stellar/stellar-sdk";

import {
  CHECKOUT_CONTRACT_ID,
  EVENT_POLL_INTERVAL_MS,
  EVENT_START_LEDGER_BACKFILL,
  RPC_URL,
} from "./config";
import { scValToString } from "./scval";
import { EventDeduplicator } from "./eventDeduplicator";

// ---------------------------------------------------------------------------
// Real-time event indexer.
//
// Polls `getEvents` (cursor-paginated) for the checkout contract and decodes
// the contract's events (`pay`, `create_order`, `dispatch`, `refund`) so the
// UI can update instantly when a payment lands. Uses a ledger backfill on
// first connect, then advances by cursor so nothing is missed between polls.
// ---------------------------------------------------------------------------

export interface IndexedEvent {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  /** Deployed checkout contract id. */
  contractId?: string;
  /** Event name, e.g. "pay", "create_order", "dispatch", "refund". */
  symbol: string;
  /** Raw topics (including the symbol as topics[0]). */
  topics: xdr.ScVal[];
  /** Decoded fields: topics[1..] as topic1..topicN plus data-map entries. */
  fields: Record<string, string>;
}

export interface IndexerStatus {
  running: boolean;
  latestLedger?: number;
  lastCursor?: string;
  eventsSeen: number;
  lastError?: string;
}

export interface IndexerCallbacks {
  onEvent: (event: IndexedEvent) => void;
  onStatus?: (status: IndexerStatus) => void;
  onError?: (error: Error) => void;
}

const RETENTION_RETRY_LEDGER_DELTA = 5;

export class PaymentEventIndexer {
  private readonly server: rpc.Server;
  private readonly contractId: string;
  private readonly pollMs: number;
  private readonly watchedSymbols: string[];

  private cursor: string | undefined;
  private startLedger: number | undefined;
  private latestLedger: number | undefined;
  private eventsSeen = 0;
  private lastError: string | undefined;
  private readonly seenIds = new EventDeduplicator();

  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private started = false;

  constructor(
    opts: {
      rpcUrl?: string;
      contractId?: string;
      pollMs?: number;
      watchedSymbols?: string[];
    } = {}
  ) {
    this.server = new rpc.Server(opts.rpcUrl ?? RPC_URL);
    this.contractId = opts.contractId ?? CHECKOUT_CONTRACT_ID;
    this.pollMs = opts.pollMs ?? EVENT_POLL_INTERVAL_MS;
    this.watchedSymbols = opts.watchedSymbols ?? ["pay", "create_order", "dispatch", "refund"];
  }

  get status(): IndexerStatus {
    return {
      running: this.running,
      latestLedger: this.latestLedger,
      lastCursor: this.cursor,
      eventsSeen: this.eventsSeen,
      lastError: this.lastError,
    };
  }

  /** Begin polling. Idempotent; safe to call again after `stop`. */
  start(callbacks: IndexerCallbacks): void {
    if (this.running) return;
    this.running = true;
    this.started = true;

    void this.initialize(callbacks);
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async initialize(callbacks: IndexerCallbacks): Promise<void> {
    try {
      const latest = await this.server.getLatestLedger();
      this.latestLedger = latest.sequence;
      this.startLedger = Math.max(1, this.latestLedger - EVENT_START_LEDGER_BACKFILL);
      callbacks.onStatus?.(this.status);
    } catch (err) {
      this.lastError = String(err instanceof Error ? err.message : err);
      callbacks.onError?.(new Error(`Could not reach the Stellar RPC: ${this.lastError}`));
    }

    this.timer = setInterval(() => void this.poll(callbacks), this.pollMs);
    void this.poll(callbacks);
  }

  private async poll(callbacks: IndexerCallbacks): Promise<void> {
    if (!this.running) return;

    try {
      const res = await this.fetchEvents();
      this.latestLedger = res.latestLedger;
      this.lastError = undefined;

      if (this.startLedger !== undefined) {
        this.startLedger = undefined;
      }
      if (res.cursor) {
        this.cursor = res.cursor;
      }

      for (const raw of res.events) {
        if (!raw.inSuccessfulContractCall) continue;
        const decoded = this.decodeEvent(raw);
        if (!decoded) continue;
        if (!this.seenIds.remember(raw.id)) continue;

        this.eventsSeen += 1;
        try {
          callbacks.onEvent(decoded);
        } catch {
          // a throwing consumer must not break the poll loop
        }
      }

      callbacks.onStatus?.(this.status);
    } catch (err) {
      this.lastError = String(err instanceof Error ? err.message : err);
      callbacks.onError?.(new Error(`getEvents failed: ${this.lastError}`));
      this.recoverFromRetentionError();
      callbacks.onStatus?.(this.status);
    }
  }

  private async fetchEvents(): Promise<rpc.Api.GetEventsResponse> {
    const filters: rpc.Api.EventFilter[] = [{ type: "contract", contractIds: [this.contractId] }];
    if (this.startLedger !== undefined) {
      return this.server.getEvents({ filters, startLedger: this.startLedger });
    }
    if (this.cursor) {
      return this.server.getEvents({ filters, cursor: this.cursor });
    }
    throw new Error("Indexer has no cursor or start ledger to poll from.");
  }

  /**
   * If the requested start ledger predates the RPC's retention window, roll
   * the window forward toward the tip so the next poll can proceed.
   */
  private recoverFromRetentionError(): void {
    if (this.startLedger !== undefined && this.latestLedger !== undefined) {
      this.startLedger = Math.max(
        this.startLedger,
        this.latestLedger - RETENTION_RETRY_LEDGER_DELTA
      );
    }
  }

  private decodeEvent(raw: rpc.Api.EventResponse): IndexedEvent | null {
    const first = raw.topic[0];
    if (!first || first.switch() !== xdr.ScValType.scvSymbol()) return null;
    const symbol = first.sym().toString();
    if (!this.watchedSymbols.includes(symbol)) return null;

    const fields: Record<string, string> = {};
    raw.topic.slice(1).forEach((topic, index) => {
      fields[`topic${index + 1}`] = scValToString(topic);
    });

    const data = raw.value;
    if (data.switch() === xdr.ScValType.scvMap()) {
      for (const entry of data.map() ?? []) {
        const key =
          entry.key().switch() === xdr.ScValType.scvSymbol()
            ? entry.key().sym().toString()
            : scValToString(entry.key());
        fields[key] = scValToString(entry.val());
      }
    } else if (data.switch() === xdr.ScValType.scvVec()) {
      fields.value = (data.vec() ?? []).map(scValToString).join(",");
    } else {
      fields.value = scValToString(data);
    }

    return {
      id: raw.id,
      ledger: raw.ledger,
      ledgerClosedAt: raw.ledgerClosedAt,
      txHash: raw.txHash,
      contractId: raw.contractId?.toString(),
      symbol,
      topics: raw.topic,
      fields,
    };
  }
}
