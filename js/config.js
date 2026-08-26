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

  // General site plan (genplan) of Европейский квартал + a map of block
  // number -> highlight rectangle. Rectangles are in PERCENT of the
  // image's own width/height (0-100) so they stay correct at any display
  // size. Measured directly off the real genplan photo (assets/genplan.jpg,
  // 4000x2323 source) using the numbered reference the client sent — if a
  // box ever looks slightly off against the real building, just nudge the
  // numbers below, nothing else needs to change.
  genplan: {
    image: "assets/genplan.jpg",
    blocks: {
      "14": { x: 50.0, y: 11.84, width: 5.0, height: 17.22 },
      "13": { x: 61.25, y: 11.84, width: 5.0, height: 16.15 },
      "12": { x: 21.08, y: 33.79, width: 10.8, height: 11.97 },
      "11": { x: 31.88, y: 33.79, width: 10.8, height: 11.97 },
      "10": { x: 42.68, y: 33.79, width: 10.8, height: 11.97 },
      "9": { x: 53.48, y: 33.79, width: 10.8, height: 11.97 },
      "8": { x: 64.28, y: 33.79, width: 10.8, height: 11.97 },
      "7": { x: 75.08, y: 33.79, width: 10.83, height: 11.97 },
      "6": { x: 27.8, y: 55.7, width: 7.2, height: 14.81 },
      "1": { x: 69.38, y: 55.7, width: 7.18, height: 14.81 },
      "5": { x: 31.55, y: 70.77, width: 12.58, height: 10.5 },
      "4": { x: 44.13, y: 70.77, width: 12.58, height: 10.5 },
      "3": { x: 56.7, y: 70.77, width: 12.58, height: 10.5 },
      "2": { x: 69.28, y: 70.77, width: 12.6, height: 10.5 },
    },
  },

  // Apartment floor plans. Each entry is matched by EXACT area (no
  // nearest-match) and, if `block` is set, only for that block; entries
  // with no `block` apply to every block. Add new layouts here as they
  // become available — nothing else in the code needs to change.
  //
  // Example entries once real files exist:
  // floorPlans: [
  //   { area: 37.96, rooms: 1, block: "14", image: "assets/floorplans/14-37.96.jpg" },
  //   { area: 40.22, rooms: 1, block: null, image: "assets/floorplans/1-room-40.22.jpg" },
  // ],
  floorPlans: [],
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
