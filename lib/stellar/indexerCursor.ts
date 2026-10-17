import { NETWORK } from "./config";

const MAX_CURSOR_LENGTH = 4096;

export function indexerCursorStorageKey(contractId: string): string {
  return `shoesafari:indexer:v1:${NETWORK}:${contractId}`;
}

function isValidCursor(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_CURSOR_LENGTH;
}

/** Read an opaque RPC cursor; invalid or unavailable browser storage is ignored safely. */
export function readIndexerCursor(contractId: string): string | undefined {
  if (typeof window === "undefined" || !contractId) return undefined;
  const key = indexerCursorStorageKey(contractId);
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    const record: unknown = JSON.parse(raw);
    if (
      record &&
      typeof record === "object" &&
      "version" in record &&
      record.version === 1 &&
      "cursor" in record &&
      isValidCursor(record.cursor)
    ) {
      return record.cursor;
    }
    window.localStorage.removeItem(key);
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage can be disabled or unavailable in private browsing contexts.
    }
  }
  return undefined;
}

/** Persist only a non-empty bounded cursor and never make storage failure fatal. */
export function writeIndexerCursor(contractId: string, cursor: string): void {
  if (typeof window === "undefined" || !contractId || !isValidCursor(cursor)) return;
  try {
    window.localStorage.setItem(
      indexerCursorStorageKey(contractId),
      JSON.stringify({ version: 1, cursor })
    );
  } catch {
    // Indexing continues from the in-memory cursor if storage is unavailable.
  }
}
