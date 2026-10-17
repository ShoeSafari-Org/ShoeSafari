import { describe, expect, it } from "vitest";
import {
  filterProductsByCategory,
  getProductCategories,
  isProductPurchasable,
  normalizeProduct,
} from "../../lib/productCatalog";

describe("normalizeProduct", () => {
  it("uses safe display fallbacks for incomplete Firestore documents", () => {
    const product = normalizeProduct({ name: 42, img: null, price: "" }, "item-1");

    expect(product).toMatchObject({
      id: "item-1",
      name: "Unnamed product",
      img: "/images/notfoundimage.png",
      price: null,
      priceError: "Price unavailable",
    });
    expect(isProductPurchasable(product)).toBe(false);
  });

  it("preserves valid product data and allows a valid price", () => {
    const product = normalizeProduct(
      { name: "Trail shoe", img: "/images/shoe1.png", price: 49.99, category: "Running" },
      "trail-shoe"
    );

    expect(product).toMatchObject({
      id: "trail-shoe",
      name: "Trail shoe",
      img: "/images/shoe1.png",
      price: 49.99,
      available: true,
    });
    expect(isProductPurchasable(product)).toBe(true);
  });

  it.each([undefined, null, "not-a-price", -1, Infinity])(
    "does not allow invalid price %s to be purchased",
    (price) => {
      const product = normalizeProduct({ name: "Shoe", price }, "shoe");
      expect(product.price).toBeNull();
      expect(isProductPurchasable(product)).toBe(false);
    }
  );

  it("does not allow an explicitly unavailable product to be purchased", () => {
    const product = normalizeProduct({ name: "Shoe", price: 20, available: false }, "shoe");
    expect(isProductPurchasable(product)).toBe(false);
  });

  it("rejects malformed top-level document values safely", () => {
    expect(normalizeProduct(null, "bad")).toBeNull();
    expect(normalizeProduct([], "bad")).toBeNull();
  });
});


describe("product category filtering", () => {
  const products = [
    normalizeProduct({ name: "Runner", price: 50, category: "Running" }, "runner"),
    normalizeProduct({ name: "Boot", price: 80, category: " Boots " }, "boot"),
    normalizeProduct({ name: "Legacy shoe", price: 40 }, "legacy"),
  ];

  it("filters categories without excluding legacy products from the all-products view", () => {
    expect(filterProductsByCategory(products, "running").map((product) => product.id)).toEqual(["runner"]);
    expect(filterProductsByCategory(products).map((product) => product.id)).toEqual(["runner", "boot", "legacy"]);
  });

  it("groups missing categories as Uncategorized and builds stable options", () => {
    expect(getProductCategories(products)).toEqual(["Boots", "Running", "Uncategorized"]);
    expect(filterProductsByCategory(products, "Uncategorized").map((product) => product.id)).toEqual(["legacy"]);
  });
});
