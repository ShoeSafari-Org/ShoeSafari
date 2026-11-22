import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";

async function expectAccessible(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const axeApi = (window as Window & {
      axe: {
        run: (
          context: Document,
          options: { runOnly: string[] }
        ) => Promise<{
          violations: Array<{
            id: string;
            impact: string | null;
            help: string;
            nodes: Array<{ target: string[]; failureSummary: string | null }>;
          }>;
        };
      };
    }).axe;
    const results = await axeApi.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    });

    return results.violations.map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
  });
  const blocking = violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? "")
  );
  const informational = violations.filter(
    (violation) => !["critical", "serious"].includes(violation.impact ?? "")
  );

  if (informational.length > 0) {
    console.info("Non-blocking axe findings:", JSON.stringify(informational));
  }
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("__shoesafari_e2e", "1");
  });
});

test("shop route meets the serious and critical accessibility baseline", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Welcome to Our Store!" })).toBeVisible();
  await expectAccessible(page);
});

test("login route meets the serious and critical accessibility baseline", async ({ page }) => {
  await page.goto("/profile/login");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expectAccessible(page);
});

test("cart dialog meets the serious and critical accessibility baseline", async ({ page }) => {
  await page.goto("/shop");
  const cartTrigger = page.getByRole("button", { name: "Open shopping cart, 0 items" });
  await cartTrigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close dialog" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(cartTrigger).toBeFocused();
  await expectAccessible(page);
});

test("checkout route meets the serious and critical accessibility baseline", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cartItems",
      JSON.stringify([{ id: "e2e-trail-runner", name: "E2E Trail Runner", price: 79.99 }])
    );
  });
  await page.route("**/api/checkout/quote", async (route) => {
    const request = route.request().postDataJSON();
    const items = [
      {
        productId: "e2e-trail-runner",
        name: "E2E Trail Runner",
        quantity: 1,
        unitPriceUsd: 79.99,
        totalUsd: 79.99,
      },
    ];
    await route.fulfill({
      json: {
        quote: { orderId: request.orderId, expiresAt: Date.now() + 600_000, totalUsd: 79.99, items },
        quoteToken: "e2e-accessibility-quote",
      },
    });
  });

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Delivery details" })).toBeVisible();
  await expectAccessible(page);
});
