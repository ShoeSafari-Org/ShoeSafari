import { NextResponse } from "next/server";
import { verifyCheckoutQuote } from "../../../../../lib/checkoutQuote";

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
