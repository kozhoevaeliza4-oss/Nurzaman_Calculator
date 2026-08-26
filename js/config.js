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

  // General site plan (genplan) of the project + a map of block number ->
  // highlight rectangle. `image` stays null until a real genplan file is
  // added to assets/ — the UI and PDF both hide the genplan section
  // entirely while it's null instead of showing a broken image.
  //
  // Rectangle coordinates are in PERCENT of the image's own width/height
  // (0-100), not pixels, so they stay correct no matter what size the
  // image is displayed at. Find them once (e.g. by opening the genplan in
  // an image editor and reading the block's bounding box in pixels, then
  // dividing by the full image width/height and multiplying by 100).
  //
  // Example once the real file + coordinates are known:
  // genplan: {
  //   image: "assets/genplan.jpg",
  //   blocks: {
  //     "14": { x: 32, y: 18, width: 12, height: 15 },
  //     "13": { x: 45, y: 18, width: 12, height: 15 },
  //   },
  // },
  genplan: {
    image: null,
    blocks: {},
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
