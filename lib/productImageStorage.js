export function createProductImageStoragePath() {
  const uniqueId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `products/${uniqueId}`;
}

export function productImageVariant(size = "medium") {
  const variants = {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 500, height: 500 },
  };
  return variants[size] || variants.medium;
}
