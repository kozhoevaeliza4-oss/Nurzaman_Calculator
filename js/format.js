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

const CYRILLIC_TO_LATIN = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
  // Kyrgyz-specific letters
  ң: "ng", ө: "o", ү: "u",
};

/**
 * Transliterates Cyrillic (incl. the Kyrgyz-specific letters) to Latin
 * and strips anything else that isn't safe in a filename. Needed because
 * a Cyrillic name in a dynamically-set `<a download>` attribute gets
 * silently dropped by Chromium/Edge — the file saves as a bare
 * "download" with no name or extension instead of failing loudly.
 */
function toSafeFileName(text) {
  const transliterated = String(text)
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(CYRILLIC_TO_LATIN, lower)) {
        const mapped = CYRILLIC_TO_LATIN[lower];
        return char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      return char;
    })
    .join("");

  return transliterated.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatNumber, formatCurrency, toSafeFileName };
}
