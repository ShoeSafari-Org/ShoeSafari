import { NextResponse } from "next/server";
import { verifyCheckoutQuote } from "../../../../../lib/checkoutQuote";
import { getFirebaseAdminDb } from "../../../../../lib/firebaseAdmin";
import { isProductAvailable } from "../../../../../lib/productAvailability";
import {
  NATIVE_ASSET_CONTRACT_ID,
  tokenForContract,
  USDC_CONTRACT_ID,
} from "../../../../../lib/stellar/config";
import { usdToXlmRawUnits, XLM_PRICE_MAX_AGE_MS } from "../../../../../lib/xlmPrice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.CHECKOUT_QUOTE_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: "Trusted checkout quotes are not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { quoteToken } = await request.json();
    const quote = verifyCheckoutQuote(quoteToken, secret);

    if (quote.payment) {
      const expectedContract =
        quote.payment.asset === "XLM" ? NATIVE_ASSET_CONTRACT_ID : USDC_CONTRACT_ID;
      if (
        quote.payment.tokenContractId !== expectedContract ||
        !/^\d+$/.test(quote.payment.amountRaw) ||
        BigInt(quote.payment.amountRaw) <= 0n
      ) {
        throw new Error("The payment amount is invalid. Return to checkout and request a new quote.");
      }
      if (quote.payment.asset === "XLM") {
        const { xlmUsdPrice, priceUpdatedAt } = quote.payment;
        if (
          !Number.isFinite(xlmUsdPrice) ||
          xlmUsdPrice! <= 0 ||
          !Number.isFinite(priceUpdatedAt) ||
          Date.now() - priceUpdatedAt! > XLM_PRICE_MAX_AGE_MS ||
          priceUpdatedAt! > Date.now() + 5_000
        ) {
          throw new Error("The XLM/USD quote is stale. Return to checkout and request a fresh quote.");
        }
        if (
          usdToXlmRawUnits(
            quote.totalUsd,
            xlmUsdPrice!,
            tokenForContract(NATIVE_ASSET_CONTRACT_ID)?.decimals ?? 7
          ) !== quote.payment.amountRaw
        ) {
          throw new Error("The XLM payment amount does not match its signed USD quote.");
        }
      }
    }

    // Availability can change after a quote is created. Re-read the catalog
    // immediately before payment authorization instead of trusting the cart.
    const db = getFirebaseAdminDb();
    const products = await Promise.all(
      quote.items.map((item) => db.collection("ShoeSafariProducts").doc(item.productId).get())
    );
    if (products.some((product) => !product.exists || !isProductAvailable(product.data()))) {
      throw new Error("A product in this checkout is no longer available. Return to your cart.");
    }

    return NextResponse.json({ quote }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid checkout quote.";
    return NextResponse.json(
      { error: message },
      {
        status: /expired/i.test(message) ? 410 : 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
