import { NextResponse } from "next/server";
import { createCheckoutQuote, signCheckoutQuote } from "../../../../lib/checkoutQuote";
import {
  checkCheckoutOrigin,
  checkJsonContentType,
} from "../../../../lib/checkout/requestGuards";
import { getFirebaseAdminDb } from "../../../../lib/firebaseAdmin";
import { validateProductDocument } from "../../../../lib/productCatalog";
import {
  NATIVE_ASSET_CONTRACT_ID,
  tokenForContract,
  USDC_CONTRACT_ID,
} from "../../../../lib/stellar/config";
import {
  fetchXlmSpotPrice,
  usdToXlmRawUnits,
  XLM_PRICE_MAX_AGE_MS,
  XLM_QUOTE_TTL_MS,
} from "../../../../lib/xlmPrice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const originCheck = checkCheckoutOrigin(request);
    if (!originCheck.ok) {
      return NextResponse.json(
        { error: originCheck.error },
        { status: originCheck.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    const contentTypeCheck = checkJsonContentType(request);
    if (!contentTypeCheck.ok) {
      return NextResponse.json(
        { error: contentTypeCheck.error },
        { status: contentTypeCheck.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json();
    const secret = process.env.CHECKOUT_QUOTE_SECRET;
    if (!secret || secret.length < 32) {
      return NextResponse.json(
        { error: "Trusted checkout quotes are not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const requestedItems = body?.items;
    if (!Array.isArray(requestedItems)) {
      return NextResponse.json({ error: "Checkout items are required." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const productIds = [...new Set(requestedItems.map((item) => item?.productId))];
    const snapshots = await Promise.all(
      productIds.map((productId) => {
        if (typeof productId !== "string") return Promise.resolve(null);
        return db.collection("ShoeSafariProducts").doc(productId).get();
      })
    );
    const products = Object.fromEntries(
      snapshots.flatMap((snapshot, index) =>
        snapshot?.exists ? [[productIds[index], snapshot.data()]] : []
      )
    );
    const invalidProducts = Object.entries(products).flatMap(([productId, product]) => {
      const validation = validateProductDocument(product, { requireImage: true });
      return validation.isValid ? [] : [{ productId, errors: validation.errors }];
    });
    if (invalidProducts.length) {
      return NextResponse.json(
        { error: "Product catalog validation failed.", fields: invalidProducts },
        { status: 503 }
      );
    }
    const quote = createCheckoutQuote(requestedItems, products, body?.orderId);
    const asset = body?.paymentAsset ?? "USDC";
    if (asset !== "USDC" && asset !== "XLM") {
      return NextResponse.json({ error: "Choose USDC or XLM to pay." }, { status: 400 });
    }
    if (asset === "XLM") {
      const spot = await fetchXlmSpotPrice();
      quote.payment = {
        asset,
        tokenContractId: NATIVE_ASSET_CONTRACT_ID,
        amountRaw: usdToXlmRawUnits(
          quote.totalUsd,
          spot.usd,
          tokenForContract(NATIVE_ASSET_CONTRACT_ID)?.decimals ?? 7
        ),
        xlmUsdPrice: spot.usd,
        priceUpdatedAt: spot.updatedAt,
      };
      quote.expiresAt = Math.min(
        quote.expiresAt,
        spot.updatedAt + XLM_PRICE_MAX_AGE_MS,
        Date.now() + XLM_QUOTE_TTL_MS
      );
      if (quote.expiresAt <= Date.now()) {
        throw new Error("The XLM/USD quote is stale. Try again or choose USDC.");
      }
    } else {
      quote.payment = {
        asset,
        tokenContractId: USDC_CONTRACT_ID,
        amountRaw: String(Math.round(quote.totalUsd * 10 ** 7)),
      };
    }

    return NextResponse.json(
      { quote, quoteToken: signCheckoutQuote(quote, secret) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create checkout quote.";
    const unavailable = /credentials|not configured/i.test(message);
    return NextResponse.json(
      { error: unavailable ? "Trusted checkout quotes are unavailable." : message },
      {
        status: unavailable ? 503 : 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
