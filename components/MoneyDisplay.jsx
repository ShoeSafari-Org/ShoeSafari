export function formatMoney(amount, currency = "USD") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatTokenAmount(amount, token = "USDC") {
  const value = Number(amount);
  return Number.isFinite(value) ? `${value.toLocaleString("en-US")} ${token}` : "Unavailable";
}

export default function MoneyDisplay({ amount, currency = "USD", token, className = "" }) {
  return (
    <span className={className} aria-label={`${currency} amount`}>
      {formatMoney(amount, currency)}{token ? ` · ${token}` : ""}
    </span>
  );
}
