import { NextResponse } from "next/server";
import { acceptedTokensFromConfig } from "../../../../lib/stellar/config";

export const runtime = "nodejs";

export async function GET() {
  const assets = acceptedTokensFromConfig().map(({ contractId, symbol, name, decimals, isNative }) => ({
    contractId,
    symbol,
    name,
    decimals,
    isNative: Boolean(isNative),
  }));

  return NextResponse.json(
    { assets, revision: assets.map((asset) => `${asset.symbol}:${asset.contractId}`).join("|") },
    { headers: { "Cache-Control": "no-store" } }
  );
}
