import { NextResponse } from "next/server";
import {
  clientKey,
  isRateLimited,
  sendPublicEmail,
  validatePublicSubmission,
} from "../../../lib/publicEmailSubmission";

export const runtime = "nodejs";

export async function POST(request) {
  const key = `contact:${clientKey(request)}`;
  if (isRateLimited(key)) {
    console.warn("Public contact submission rate limit exceeded");
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const values = validatePublicSubmission(await request.json());
    await sendPublicEmail(values);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.warn("Public contact submission rejected", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to send your message." }, { status: 400 });
  }
}
