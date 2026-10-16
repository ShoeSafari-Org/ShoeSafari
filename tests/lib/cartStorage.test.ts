import { restoreCart } from "../../lib/cartStorage";

function makeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe("restoreCart", () => {
  it("restores an empty cart when no cart data exists", () => {
    const storage = makeStorage({ theme: "dark" });

    expect(restoreCart(storage)).toEqual({
      items: [],
      itemCount: 0,
      totalPrice: 0,
      recovered: false,
    });
    expect(storage.values.get("theme")).toBe("dark");
  });

  it("clears malformed cart JSON and only touches cart keys", () => {
    const storage = makeStorage({
      cartItems: "{not-json",
      itemCount: "2",
      totalPrice: "30",
      theme: "dark",
    });

    expect(restoreCart(storage)).toEqual({
      items: [],
      itemCount: 0,
      totalPrice: 0,
      recovered: true,
    });
    expect(storage.values.has("cartItems")).toBe(false);
    expect(storage.values.has("itemCount")).toBe(false);
    expect(storage.values.has("totalPrice")).toBe(false);
    expect(storage.values.get("theme")).toBe("dark");
  });

  it("keeps valid legacy products, discards invalid records, and recalculates totals", () => {
    const legacyItem = { id: "shoe-1", name: "Runner", img: "/runner.png", price: "19.5" };
    const storage = makeStorage({
      cartItems: JSON.stringify([
        legacyItem,
        { id: "shoe-2", name: "Bad price", img: "/bad.png", price: "free" },
        { name: "Missing id", img: "/missing.png", price: 10 },
        null,
      ]),
      itemCount: "400",
      totalPrice: "9999",
      session: "keep-me",
    });

    expect(restoreCart(storage)).toEqual({
      items: [{ ...legacyItem, price: 19.5 }],
      itemCount: 1,
      totalPrice: 19.5,
      recovered: true,
    });
    expect(storage.values.get("itemCount")).toBe("1");
    expect(storage.values.get("totalPrice")).toBe("19.5");
    expect(storage.values.get("session")).toBe("keep-me");
  });
});
