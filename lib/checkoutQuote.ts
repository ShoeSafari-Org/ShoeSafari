import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { isProductAvailable } from "./productAvailability";
import { isCustomerOrderReference } from "./orderReference";

export const CHECKOUT_QUOTE_TTL_MS = 10 * 60 * 1000;
export const CHECKOUT_QUOTE_SCHEMA_VERSION = 1;
const MAX_LINES = 50;
const MAX_QUANTITY_PER_PRODUCT = 99;

export interface RequestedQuoteItem {
  productId: string;
  quantity: number;
}

export interface QuotedItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
  totalUsd: number;
}

export interface CheckoutQuote {
  schemaVersion: number;
  quoteId: string;
  orderId: string;
  items: QuotedItem[];
  totalUsd: number;
  expiresAt: number;
  payment?: {
    asset: "USDC" | "XLM";
    tokenContractId: string;
    amountRaw: string;
    /** CoinGecko spot price used for XLM, in USD per XLM. */
    xlmUsdPrice?: number;
    /** Source update time in Unix milliseconds. */
    priceUpdatedAt?: number;
  };
}

export function createCheckoutQuote(
  requestedItems: unknown,
  products: Record<string, Record<string, unknown> | undefined>,
  orderId: unknown,
  now = Date.now()
): CheckoutQuote {
  if (
    !Array.isArray(requestedItems) ||
    requestedItems.length === 0 ||
    requestedItems.length > MAX_LINES
  ) {
    throw new Error("Add between 1 and 50 products to checkout.");
  }
  if (!isCustomerOrderReference(orderId)) {
    throw new Error("Invalid order reference.");
  }

  const quantities = new Map<string, number>();
  for (const item of requestedItems as RequestedQuoteItem[]) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(item.productId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY_PER_PRODUCT
    ) {
      throw new Error("A product or quantity is invalid.");
    }
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      throw new Error("A product quantity is too large.");
    }
    quantities.set(item.productId, quantity);
  }

  const items = [...quantities.entries()].map(([productId, quantity]) => {
    const product = products[productId];
    if (!product) throw new Error(`Product ${productId} is unavailable.`);
    if (!isProductAvailable(product)) {
      throw new Error(`Product ${productId} is unavailable.`);
    }
    const price = Number(product.price);
    const priceInCents = Math.round(price * 100);
    if (
      !Number.isFinite(price) ||
      priceInCents <= 0 ||
      Math.abs(price * 100 - priceInCents) > 1e-6
    ) {
      throw new Error(`Product ${productId} has an invalid price.`);
    }
    const unitPriceUsd = priceInCents / 100;
    return {
      productId,
      name: typeof product.name === "string" ? product.name : "ShoeSafari product",
      quantity,
      unitPriceUsd,
      totalUsd: (priceInCents * quantity) / 100,
    };
  });

  const totalCents = items.reduce((sum, item) => sum + Math.round(item.totalUsd * 100), 0);
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error("Checkout total is invalid.");
  }

  return {
    schemaVersion: CHECKOUT_QUOTE_SCHEMA_VERSION,
    quoteId: randomUUID(),
    orderId,
    items,
    totalUsd: totalCents / 100,
    expiresAt: now + CHECKOUT_QUOTE_TTL_MS,
  };
}

export function signCheckoutQuote(quote: CheckoutQuote, secret: string): string {
  const payload = Buffer.from(JSON.stringify(quote)).toString("base64url");
  return `${payload}.${signatureFor(payload, secret)}`;
}

export function verifyCheckoutQuote(
  token: unknown,
  secret: string,
  now = Date.now()
): CheckoutQuote {
  if (typeof token !== "string") throw new Error("Invalid checkout quote.");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid checkout quote.");

  const expected = Buffer.from(signatureFor(payload, secret));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("Invalid checkout quote signature.");
  }

  let parsed: Partial<CheckoutQuote>;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid checkout quote payload.");
  }
  if (parsed.schemaVersion !== undefined && parsed.schemaVersion !== CHECKOUT_QUOTE_SCHEMA_VERSION) {
    throw new Error("Unsupported checkout quote version. Return to checkout and request a new quote.");
  }
  if (!Array.isArray(parsed.items) || typeof parsed.orderId !== "string" || typeof parsed.quoteId !== "string") {
    throw new Error("Invalid checkout quote schema. Return to checkout and request a new quote.");
  }
  const quote = { ...parsed, schemaVersion: CHECKOUT_QUOTE_SCHEMA_VERSION } as CheckoutQuote;
  if (!Number.isFinite(quote.expiresAt) || quote.expiresAt <= now) {
    throw new Error("This checkout quote has expired. Return to your cart and try again.");
  }
  return quote;
}

function signatureFor(payload: string, secret: string): string {
  if (!secret || secret.length < 32) {
    throw new Error("Checkout quote signing is not configured.");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
