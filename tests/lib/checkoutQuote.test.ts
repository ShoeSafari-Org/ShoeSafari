import {
  CHECKOUT_QUOTE_TTL_MS,
  createCheckoutQuote,
  signCheckoutQuote,
  verifyCheckoutQuote,
} from "../../lib/checkoutQuote";

const secret = "test-only-secret-that-is-longer-than-32-characters";
const products = {
  boot: { name: "Trail boot", price: 49.99 },
  sandal: { name: "Sandal", price: 20 },
};

describe("trusted checkout quotes", () => {
  it("calculates the total from catalog prices and aggregates duplicate items", () => {
    const quote = createCheckoutQuote(
      [
        { productId: "boot", quantity: 1 },
        { productId: "boot", quantity: 2 },
        { productId: "sandal", quantity: 1 },
      ],
      products,
      "SS-test-order",
      1000
    );

    expect(quote.items).toEqual([
      {
        productId: "boot",
        name: "Trail boot",
        quantity: 3,
        unitPriceUsd: 49.99,
        totalUsd: 149.97,
      },
      {
        productId: "sandal",
        name: "Sandal",
        quantity: 1,
        unitPriceUsd: 20,
        totalUsd: 20,
      },
    ]);
    expect(quote.totalUsd).toBe(169.97);
    expect(quote.expiresAt).toBe(1000 + CHECKOUT_QUOTE_TTL_MS);
  });

  it("keeps legacy products without availability purchasable", () => {
    expect(
      createCheckoutQuote([{ productId: "boot", quantity: 1 }], products, "SS-legacy")
        .items[0].productId
    ).toBe("boot");
  });

  it("allows explicitly available products", () => {
    const quote = createCheckoutQuote(
      [{ productId: "boot", quantity: 1 }],
      { boot: { name: "Boot", price: 20, available: true } },
      "SS-available"
    );
    expect(quote.totalUsd).toBe(20);
  });

  it.each([
    [[{ productId: "missing", quantity: 1 }], {}],
    [[{ productId: "boot", quantity: 1 }], { boot: { name: "Boot", price: 20, available: false } }],
    [[{ productId: "boot", quantity: 0 }], products],
  ])("rejects unavailable products and invalid quantities", (items, catalog) => {
    expect(() => createCheckoutQuote(items, catalog, "SS-order")).toThrow();
  });

  it("rejects a modified total and an expired signed quote", () => {
    const quote = createCheckoutQuote(
      [{ productId: "boot", quantity: 1 }],
      products,
      "SS-test-order",
      1000
    );
    const token = signCheckoutQuote(quote, secret);
    expect(verifyCheckoutQuote(token, secret, 1001)).toEqual(quote);

    const [payload, signature] = token.split(".");
    const changedPayload = Buffer.from(JSON.stringify({ ...quote, totalUsd: 0.01 })).toString(
      "base64url"
    );
    expect(() => verifyCheckoutQuote(`${changedPayload}.${signature}`, secret, 1001)).toThrow(
      /signature/i
    );
    expect(() => verifyCheckoutQuote(token, secret, quote.expiresAt)).toThrow(/expired/i);
  });
});
