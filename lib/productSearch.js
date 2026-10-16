export function searchProducts(products, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return products;

  return products.filter((product) =>
    [product.name, product.description, product.category]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  );
}
