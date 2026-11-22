import { describe, expect, it } from "vitest";
import { EventDeduplicator, MAX_SEEN_EVENT_IDS } from "../../../lib/stellar/eventDeduplicator";

describe("EventDeduplicator under a large cursor page", () => {
  it("deduplicates overlap while keeping a bounded replay window", () => {
    const deduplicator = new EventDeduplicator(3);

    expect(["ledger-1", "ledger-2", "ledger-3", "ledger-2", "ledger-4"].map((id) =>
      deduplicator.remember(id)
    )).toEqual([true, true, true, false, true]);
    expect(deduplicator.size).toBe(3);

    // FIFO eviction permits an old cursor retry without growing memory.
    expect(deduplicator.remember("ledger-1")).toBe(true);
    expect(deduplicator.size).toBe(3);
    expect(deduplicator.remember("ledger-2")).toBe(false);
  });

  it("retains no more than the production replay-window bound", () => {
    const deduplicator = new EventDeduplicator();

    for (let index = 0; index < MAX_SEEN_EVENT_IDS * 2; index += 1) {
      deduplicator.remember(`event-${index}`);
    }

    expect(deduplicator.size).toBe(MAX_SEEN_EVENT_IDS);
  });
});
