export function createProductImageStoragePath() {
  const uniqueId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `products/${uniqueId}`;
}
