import { NextResponse } from "next/server";
import { createCheckoutQuote, signCheckoutQuote } from "../../../../lib/checkoutQuote";
import { getFirebaseAdminDb } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
    const quote = createCheckoutQuote(requestedItems, products, body?.orderId);

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
