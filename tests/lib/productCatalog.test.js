import { describe, expect, it } from "vitest";
import { isProductPurchasable, normalizeProduct } from "../../lib/productCatalog";

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
