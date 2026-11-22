export const XLM_PRICE_MAX_AGE_MS = 60_000;
export const XLM_QUOTE_TTL_MS = 60_000;

export interface XlmSpotPrice {
  usd: number;
  updatedAt: number;
}

export interface XlmPriceProvider {
  fetchSpotPrice(): Promise<{ ok: boolean; json(): Promise<unknown> }>;
}

export const coingeckoXlmPriceProvider: XlmPriceProvider = {
  fetchSpotPrice: () =>
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_last_updated_at=true",
      { cache: "no-store", signal: AbortSignal.timeout(5_000) }
    ),
};

/** Fetch an explicitly timestamped public XLM/USD quote from a provider. */
export async function fetchXlmSpotPrice(
  now = Date.now(),
  provider: XlmPriceProvider = coingeckoXlmPriceProvider
): Promise<XlmSpotPrice> {
  const response = await provider.fetchSpotPrice();
  if (!response.ok) throw new Error("The XLM/USD quote source is unavailable. Try USDC instead.");

  const body = await response.json();
  const usd = body?.stellar?.usd;
  const updatedAt = Number(body?.stellar?.last_updated_at) * 1000;
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(updatedAt)) {
    throw new Error("The XLM/USD quote source returned an invalid price. Try USDC instead.");
  }
  if (updatedAt > now + 5_000 || now - updatedAt > XLM_PRICE_MAX_AGE_MS) {
    throw new Error("The XLM/USD quote is stale. Try again or choose USDC.");
  }
  return { usd, updatedAt };
}

/** Round upward to the token's smallest unit so rounding cannot undercharge. */
export function usdToXlmRawUnits(totalUsd: number, xlmUsdPrice: number, decimals = 7): string {
  if (
    !Number.isFinite(totalUsd) ||
    totalUsd <= 0 ||
    !Number.isFinite(xlmUsdPrice) ||
    xlmUsdPrice <= 0 ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 18
  ) {
    throw new Error("Could not calculate the XLM payment amount.");
  }
  const scale = 10 ** decimals;
  const amount = Math.ceil((totalUsd / xlmUsdPrice) * scale);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("The XLM payment amount is outside the supported range.");
  }
  return String(amount);
}
