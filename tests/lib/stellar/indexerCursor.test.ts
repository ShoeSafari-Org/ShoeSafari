import { afterEach, describe, expect, it, vi } from "vitest";
import {
  indexerCursorStorageKey,
  readIndexerCursor,
  writeIndexerCursor,
} from "../../../lib/stellar/indexerCursor";

const contractId = "C" + "A".repeat(55);
const key = indexerCursorStorageKey(contractId);

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("persisted indexer cursor", () => {
  it("round trips a valid opaque cursor", () => {
    writeIndexerCursor(contractId, "rpc-cursor-123");
    expect(readIndexerCursor(contractId)).toBe("rpc-cursor-123");
  });

  it("discards malformed stored data and starts without a cursor", () => {
    window.localStorage.setItem(key, "not-json");
    expect(readIndexerCursor(contractId)).toBeUndefined();
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("discards records with an unsupported version or empty cursor", () => {
    window.localStorage.setItem(key, JSON.stringify({ version: 2, cursor: "old" }));
    expect(readIndexerCursor(contractId)).toBeUndefined();
    window.localStorage.setItem(key, JSON.stringify({ version: 1, cursor: "  " }));
    expect(readIndexerCursor(contractId)).toBeUndefined();
  });

  it("ignores storage failures", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(readIndexerCursor(contractId)).toBeUndefined();
  });
});
