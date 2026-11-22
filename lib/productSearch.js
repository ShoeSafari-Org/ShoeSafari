function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : 1 + Math.min(diagonal, row[j - 1], above);
      diagonal = above;
    }
  }
  return row[right.length];
}

function matchesSearchTerm(product, query) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  const text = normalizeSearchText([product.name, product.description, product.category].filter(Boolean).join(" "));
  const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return terms.every((term) =>
    text.includes(term) || words.some((word) => term.length >= 4 && editDistance(word, term) <= 1)
  );
}

/** Deterministic client-side fallback search for the currently loaded catalog page. */
export function searchProducts(products, query) {
  const normalizedQuery = normalizeSearchText(query).trim();
  const visibleProducts = products.filter((product) => product?.available !== false);
  if (!normalizedQuery) return visibleProducts.length === products.length ? products : visibleProducts;
  return visibleProducts.filter((product) => matchesSearchTerm(product, normalizedQuery));
}
