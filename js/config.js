/**
 * Config / future data layer.
 *
 * Right now the calculator only knows about the standard installment
 * terms and two currencies (USD, KGS). Everything below is intentionally
 * a plain data structure so that later features (projects, blocks,
 * rooms, auto price-per-m2, per-project installment rules, WhatsApp /
 * Bitrix24 integration) can be added by extending this object instead
 * of rewriting the calculator or the UI.
 */
const CONFIG = {
  currency: {
    default: "USD",
    options: ["USD", "KGS"],
    symbols: {
      USD: "$",
      KGS: "сом",
    },
    // Single source of truth for the exchange rate. Change this one
    // value to update the rate everywhere in the app.
    usdToKgsRate: 87,
  },

  installmentTerms: [12, 18, 24, 30, 36, 48, 60],

  brand: {
    logo: "assets/logo.png",
  },

  // The single active project shown in the app + PDF offer. Kept as a
  // plain object (not the `projects` list below) so today's UI can stay
  // simple; switching to a picker later just means reading from
  // `projects` instead and no calculator/PDF code needs to change.
  project: {
    name: "Европейский квартал",
    render: "assets/render.jpg",
  },

  // Placeholder for future per-project data (projects -> blocks -> rooms -> price).
  // Example future shape:
  // projects: [
  //   { id: "aiturgan-1", name: "Айтурган-1", blocks: [
  //       { id: "block-a", name: "Блок A", rooms: [
  //           { id: "1-room", name: "1-комнатная", pricePerM2: 1050 },
  //       ]},
  //   ]},
  // ],
  projects: [],
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
