import { describe, expect, it } from "vitest";
import { searchProducts } from "../../lib/productSearch";

const products = [
  { id: "1", name: "Trail Runner", description: "Lightweight outdoor shoe" },
  { id: "2", name: "City Sneaker", category: "casual" },
];

describe("searchProducts", () => {
  it("matches product text without case sensitivity", () => {
    expect(searchProducts(products, "TRAIL")).toEqual([products[0]]);
  });

  it("matches category and description while ignoring missing fields", () => {
    expect(searchProducts(products, "CASUAL")).toEqual([products[1]]);
    expect(searchProducts(products, "outdoor")).toEqual([products[0]]);
  });

  it("returns all products for a blank query and an empty list for no match", () => {
    expect(searchProducts(products, "  ")).toBe(products);
    expect(searchProducts(products, "missing")).toEqual([]);
  });
});
