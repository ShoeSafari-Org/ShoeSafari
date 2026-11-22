const FALLBACK_IMAGE = "/images/notfoundimage.png";

/** Convert an untrusted Firestore document into the shape rendered by the shop. */
export function normalizeProduct(value, id) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value;
  const images = Array.isArray(raw.images)
    ? raw.images.filter((image) => typeof image === "string" && image.trim())
    : [];
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

  const primaryImage =
    typeof raw.img === "string" && raw.img.trim() ? raw.img.trim() : FALLBACK_IMAGE;
  return {
    id: typeof id === "string" ? id : "",
    name:
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : "Unnamed product",
    description: typeof raw.description === "string" ? raw.description : "",
    category: typeof raw.category === "string" ? raw.category : "",
    img: primaryImage,
    images: [...new Set([primaryImage, ...images])],
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

export function getRelatedProducts(products, currentId, category, maxResults = 4) {
  const normalizedCategory = typeof category === "string" ? category.trim().toLowerCase() : "";
  if (!normalizedCategory) return [];
  return products
    .filter((product) => product?.id !== currentId && product?.available !== false)
    .filter((product) => productCategory(product).toLowerCase() === normalizedCategory)
    .slice(0, maxResults);
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
