/** Maximum number of recent event IDs retained by the browser indexer. */
export const MAX_SEEN_EVENT_IDS = 5_000;

/**
 * FIFO deduplication for cursor retries and overlapping poll windows.
 * Older IDs become eligible again once they leave the bounded replay window.
 */
export class EventDeduplicator {
  private readonly ids = new Set<string>();

  constructor(private readonly capacity = MAX_SEEN_EVENT_IDS) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Event deduplication capacity must be a positive integer.");
    }
  }

  remember(id: string): boolean {
    if (this.ids.has(id)) return false;

    this.ids.add(id);
    if (this.ids.size > this.capacity) {
      const oldest = this.ids.values().next().value;
      if (oldest !== undefined) this.ids.delete(oldest);
    }

    return true;
  }

  get size(): number {
    return this.ids.size;
  }
}
