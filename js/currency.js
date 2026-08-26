/**
 * Currency conversion helpers. Pure functions, no DOM access. The
 * exchange rate itself lives in one place — CONFIG.currency.usdToKgsRate
 * — so it never gets hardcoded into a formula here or anywhere else.
 */

function getCurrencySymbol(currencyCode) {
  return CONFIG.currency.symbols[currencyCode] || "";
}

/**
 * Converts an amount from one currency to another. Returns the amount
 * unchanged (still rounded) when the currencies match, or when the
 * value isn't a finite number.
 */
function convertAmount(amount, fromCurrency, toCurrency) {
  if (!Number.isFinite(amount)) {
    return amount;
  }
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = CONFIG.currency.usdToKgsRate;

  if (fromCurrency === "USD" && toCurrency === "KGS") {
    return roundToCents(amount * rate);
  }
  if (fromCurrency === "KGS" && toCurrency === "USD") {
    return roundToCents(amount / rate);
  }

  return amount;
}

function roundToCents(value) {
  return Math.round(value * 100) / 100;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getCurrencySymbol, convertAmount, roundToCents };
}
