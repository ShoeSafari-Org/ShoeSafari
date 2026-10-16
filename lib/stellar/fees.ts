const STROOPS_PER_XLM = 10_000_000n;

/** Format a non-negative Stellar fee in stroops as XLM without floating-point rounding. */
export function formatStroopsAsXlm(stroops: string | bigint | null | undefined): string | null {
  if (stroops === null || stroops === undefined) return null;

  let amount: bigint;
  try {
    if (typeof stroops === "string" && !/^\d+$/.test(stroops)) return null;
    amount = BigInt(stroops);
  } catch {
    return null;
  }
  if (amount < 0n) return null;

  const whole = amount / STROOPS_PER_XLM;
  const fraction = (amount % STROOPS_PER_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
