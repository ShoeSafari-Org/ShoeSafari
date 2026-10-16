import { expect, test } from "@playwright/test";

type MockQuote = {
  orderId: string;
  expiresAt: number;
  totalUsd: number;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceUsd: number;
    totalUsd: number;
  }>;
};

test("buyer selects a shoe, adds it to the cart, connects a mocked wallet, and confirms payment", async ({
  page,
}) => {
  let mockedQuote: MockQuote | undefined;
  await page.addInitScript(() => {
    window.localStorage.setItem("__shoesafari_e2e", "1");
  });

  await page.route("**/api/checkout/quote", async (route) => {
    const body = route.request().postDataJSON();
    mockedQuote = {
      orderId: body.orderId,
      expiresAt: Date.now() + 10 * 60 * 1000,
      totalUsd: 79.99,
      items: [
        {
          productId: "e2e-trail-runner",
          name: "E2E Trail Runner",
          quantity: 1,
          unitPriceUsd: 79.99,
          totalUsd: 79.99,
        },
      ],
    };
    await route.fulfill({ json: { quote: mockedQuote, quoteToken: "e2e-quote-token" } });
  });

  await page.route("**/api/checkout/quote/verify", async (route) => {
    if (!mockedQuote) throw new Error("The checkout quote was not created before verification.");
    await route.fulfill({ json: { quote: mockedQuote, quoteToken: "e2e-quote-token" } });
  });

  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "E2E Trail Runner" })).toBeVisible();
  await page.locator(".grid button").first().click();
  await expect(page.getByText("Item added to cart")).toBeVisible();

  await page
    .locator("button")
    .filter({ has: page.locator("span.animate-bounce") })
    .click();
  await expect(page.getByRole("heading", { name: "Cart Items" })).toBeVisible();
  await expect(page.getByText("E2E Trail Runner").last()).toBeVisible();
  await page.getByRole("button", { name: "CheckOut" }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText(/Server-confirmed checkout total: \$79\.99 USDC/)).toBeVisible();
  await page.getByRole("button", { name: /Pay with USDC/ }).click();

  await expect(page.getByRole("heading", { name: "Order Completed." })).toBeVisible();
  await expect(page.getByText(/Payment received ✓/)).toBeVisible();
});
