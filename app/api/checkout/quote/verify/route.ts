import { NextResponse } from "next/server";
import { verifyCheckoutQuote } from "../../../../../lib/checkoutQuote";
import { getFirebaseAdminDb } from "../../../../../lib/firebaseAdmin";
import { isProductAvailable } from "../../../../../lib/productAvailability";

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
