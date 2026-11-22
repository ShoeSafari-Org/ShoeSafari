const fallbackLocale = "en-US";

export function formatNumber(value, locale = fallbackLocale, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  return new Intl.NumberFormat(locale, options).format(number);
}

export function formatCurrency(value, currency = "USD", locale = fallbackLocale) {
  return formatNumber(value, locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}

export function formatToken(value, token = "USDC", locale = fallbackLocale) {
  const formatted = formatNumber(value, locale);
  return formatted === "Unavailable" ? formatted : `${formatted} ${token}`;
}
