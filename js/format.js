/**
 * Number / currency formatting helpers. Pure functions, no DOM access,
 * so they can be reused later (e.g. for a WhatsApp message template).
 */

/**
 * Formats a number with thousands separators (space-grouped, ru/ky
 * style) and up to 2 decimal places — trailing decimals only appear
 * when the value actually has a fractional part.
 */
function formatNumber(value) {
  if (typeof value !== "number" || !isFinite(value)) {
    return "0";
  }

  const rounded = Math.round(value * 100) / 100;
  const hasFraction = Math.abs(rounded % 1) > 1e-9;

  return rounded.toLocaleString("ru-RU", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a value as currency, e.g. formatCurrency(68250, "USD") -> "68 250 $",
 * formatCurrency(10875000, "KGS") -> "10 875 000 сом".
 */
function formatCurrency(value, currencyCode) {
  const code = currencyCode || CONFIG.currency.default;
  const symbol = getCurrencySymbol(code);
  return `${formatNumber(value)} ${symbol}`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatNumber, formatCurrency };
}
