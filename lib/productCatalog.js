const FALLBACK_IMAGE = "/images/notfoundimage.png";

/** Convert an untrusted Firestore document into the shape rendered by the shop. */
export function normalizeProduct(value, id) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value;
  const parsedPrice =
    typeof raw.price === "number"
      ? raw.price
      : typeof raw.price === "string" && raw.price.trim() !== ""
        ? Number(raw.price)
        : Number.NaN;
  const priceInCents = Math.round(parsedPrice * 100);
  const validPrice =
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0 &&
    Number.isSafeInteger(priceInCents) &&
    Math.abs(parsedPrice * 100 - priceInCents) <= 1e-6;
  const price = validPrice ? priceInCents / 100 : null;

  return {
    id: typeof id === "string" ? id : "",
    name:
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : "Unnamed product",
    description: typeof raw.description === "string" ? raw.description : "",
    category: typeof raw.category === "string" ? raw.category : "",
    img:
      typeof raw.img === "string" && raw.img.trim() ? raw.img.trim() : FALLBACK_IMAGE,
    price,
    priceError: validPrice ? null : "Price unavailable",
    available: raw.available !== false,
  };
}

export function productCategory(product) {
  return typeof product?.category === "string" && product.category.trim()
    ? product.category.trim()
    : "Uncategorized";
}

export function getProductCategories(products) {
  return [...new Set(products.map(productCategory))].sort((left, right) =>
    left.localeCompare(right)
  );
}

export function filterProductsByCategory(products, selectedCategory = "all") {
  if (selectedCategory === "all") return products;
  return products.filter(
    (product) => productCategory(product).toLowerCase() === selectedCategory.toLowerCase()
  );
}

export function isProductPurchasable(product) {
  return Boolean(
    product &&
      typeof product === "object" &&
      typeof product.id === "string" &&
      product.id.trim() &&
      product.available !== false &&
      typeof product.price === "number" &&
      Number.isFinite(product.price) &&
      product.price > 0 &&
      Math.abs(product.price * 100 - Math.round(product.price * 100)) <= 1e-6
  );
}
