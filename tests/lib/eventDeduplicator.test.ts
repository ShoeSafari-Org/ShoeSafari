import { EventDeduplicator } from "../../lib/stellar/eventDeduplicator";

describe("EventDeduplicator", () => {
  it("ignores duplicates while their IDs remain in the replay window", () => {
    const deduplicator = new EventDeduplicator(3);

    expect(deduplicator.remember("event-1")).toBe(true);
    expect(deduplicator.remember("event-2")).toBe(true);
    expect(deduplicator.remember("event-1")).toBe(false);
    expect(deduplicator.size).toBe(2);
  });

  it("evicts the oldest ID at capacity and remains bounded", () => {
    const deduplicator = new EventDeduplicator(2);

    deduplicator.remember("event-1");
    deduplicator.remember("event-2");
    deduplicator.remember("event-3");

    expect(deduplicator.size).toBe(2);
    expect(deduplicator.remember("event-1")).toBe(true);
    expect(deduplicator.size).toBe(2);
  });
});
