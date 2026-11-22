import { NETWORK, NETWORK_PASSPHRASE } from "./config";

const MAX_CURSOR_LENGTH = 4096;

export function indexerCursorStorageKey(contractId: string): string {
  return `shoesafari:indexer:v2:${NETWORK_PASSPHRASE}:${contractId}`;
}

function legacyIndexerCursorStorageKey(contractId: string): string {
  return `shoesafari:indexer:v1:${NETWORK}:${contractId}`;
}

function isValidCursor(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_CURSOR_LENGTH;
}

/** Read an opaque RPC cursor; invalid or unavailable browser storage is ignored safely. */
export function readIndexerCursor(contractId: string): string | undefined {
  if (typeof window === "undefined" || !contractId) return undefined;
  const key = indexerCursorStorageKey(contractId);
  const legacyKey = legacyIndexerCursorStorageKey(contractId);
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      const record: unknown = JSON.parse(raw);
      if (
        record &&
        typeof record === "object" &&
        "version" in record &&
        record.version === 2 &&
        "networkPassphrase" in record &&
        record.networkPassphrase === NETWORK_PASSPHRASE &&
        "contractId" in record &&
        record.contractId === contractId &&
        "cursor" in record &&
        isValidCursor(record.cursor)
      ) {
        return record.cursor;
      }
      window.localStorage.removeItem(key);
    }

    // v1 was already scoped by network and contract id. Migrate only that
    // exact legacy key, then rewrite it with explicit metadata.
    const legacyRaw = window.localStorage.getItem(legacyKey);
    if (legacyRaw !== null) {
      const legacy: unknown = JSON.parse(legacyRaw);
      if (
        legacy &&
        typeof legacy === "object" &&
        "version" in legacy &&
        legacy.version === 1 &&
        "cursor" in legacy &&
        isValidCursor(legacy.cursor)
      ) {
        writeIndexerCursor(contractId, legacy.cursor);
        window.localStorage.removeItem(legacyKey);
        return legacy.cursor;
      }
      window.localStorage.removeItem(legacyKey);
    }
  } catch {
    try {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(legacyKey);
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
      JSON.stringify({
        version: 2,
        networkPassphrase: NETWORK_PASSPHRASE,
        contractId,
        cursor,
      })
    );
  } catch {
    // Indexing continues from the in-memory cursor if storage is unavailable.
  }
}
