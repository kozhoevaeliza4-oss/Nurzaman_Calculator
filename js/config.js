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
    // Location/infrastructure context map (distances to nearby streets
    // and landmarks). Set to null to hide that block everywhere.
    locationMap: "assets/location-map.jpg",
    // Short PDF copy — plain strings on purpose, so wording can be
    // tuned any time without touching pdf.js.
    whyThisApartment: {
      ky: "Аянттын, кабаттын жана баанын ыңгайлуу айкалышы",
      ru: "Продуманное сочетание площади, этажа и цены",
    },
    closingMessage: {
      ky: "Ишенимиңиз үчүн рахмат",
      ru: "Спасибо за доверие",
    },

    // Factual, contract-only apartment fit-out. Edit freely, but only
    // list what's actually in the contract.
    komplectation: [
      { ky: "Дубалдардын толук шыбалышы", ru: "Чистовая штукатурка стен" },
      { ky: "Терезелер жана балкондор", ru: "Окна и балконы" },
      { ky: "Кире турган эшик", ru: "Входная дверь" },
      { ky: "Электр эсептегичтер", ru: "Электросчётчики" },
      { ky: "Газдаштыруу", ru: "Газификация" },
      { ky: "Электр менен камсыздоо", ru: "Электроснабжение" },
      { ky: "Жылытуу, суу менен камсыздоо жана канализация", ru: "Отопление, водоснабжение и канализация" },
      { ky: "Газосиликат блоктон дубалдар", ru: "Стены и перегородки из газосиликатного блока" },
      { ky: "Полдун ара стяжкасы", ru: "Черновая стяжка пола" },
      { ky: "Интернет жана ТВ кабели", ru: "Интернет- и TV-кабель" },
      { ky: "Жүргүнчү лифттери", ru: "Пассажирские лифты" },
    ],

    // Nearby infrastructure, grouped for the "Расположение" page. Each
    // entry is shown as-is (proper names + travel time), no translation
    // attempted for place names.
    infrastructure: {
      parks: {
        ky: "Парктар",
        ru: "Парки",
        items: ["Сквер Каныкей — 3 минуты езды", "Сквер им. Исхака Раззакова — 3 минуты езды"],
      },
      schools: {
        ky: "Мектептер",
        ru: "Школы и учебные заведения",
        items: [
          "Ансар-Тайп — 2 минуты пешком",
          "Школа-гимназия №22 им. С. Шарипова — 17 мин пешком / 8 мин езды",
          "Школа-гимназия №7 им. Наримана — 18 мин пешком / 6 мин езды",
          "Школа №79 — 19 мин пешком / 3 минуты езды",
        ],
      },
      markets: {
        ky: "Супермаркеттер",
        ru: "Супермаркеты",
        items: ["Globus — 7 минут езды", "Bimar — 10 минут пешком", "Азия гипермаркет — 5 минут езды"],
      },
    },
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
      "14": { x: 50.13, y: 11.84, width: 4.88, height: 18.51 },
      "13": { x: 61.5, y: 11.84, width: 4.75, height: 16.57 },
      "12": { x: 21.13, y: 34.44, width: 8.93, height: 9.25 },
      "11": { x: 30.45, y: 34.44, width: 8.98, height: 9.25 },
      "10": { x: 39.83, y: 34.44, width: 8.68, height: 9.25 },
      "9": { x: 50.75, y: 34.44, width: 7.68, height: 9.25 },
      "8": { x: 58.83, y: 34.44, width: 8.23, height: 9.25 },
      "7": { x: 67.45, y: 34.44, width: 10.3, height: 9.25 },
      "6": { x: 27.38, y: 55.53, width: 7.5, height: 14.21 },
      "1": { x: 71.13, y: 56.82, width: 5.38, height: 12.05 },
      "5": { x: 31.88, y: 71.46, width: 8.43, height: 7.32 },
      "4": { x: 40.7, y: 71.46, width: 8.68, height: 7.32 },
      "3": { x: 54.88, y: 71.46, width: 8.05, height: 7.32 },
      "2": { x: 63.33, y: 71.46, width: 11.05, height: 7.32 },
    },
  },

  // Apartment floor plans. Matched by EXACT area (no nearest-match) plus
  // block: `block` can be a single number, a list of blocks that share a
  // layout, or omitted for a plan that's the same in literally every
  // block. A block-scoped plan always wins over a `block`-less one for
  // the same area, so a block with its own dedicated layout never
  // accidentally shows a different block's plan.
  //
  // rooms follows the local "N-комнатная" convention (living room counts
  // as one of the N; a studio with no separate bedroom is rooms: 0) —
  // it's purely descriptive for the client PDF, not used for matching,
  // so feel free to correct any of these numbers without touching
  // anything else.
  floorPlans: [
    // Same layout in every block — no `block` key needed.
    {
      area: 40.22,
      rooms: 2,
      image: "assets/floorplans/40.22-euro.jpg",
    },

    // Blocks 1, 6, 9, 10 have their own apartment catalogue.
    {
      area: 38.34,
      rooms: 1,
      block: ["1", "6", "9", "10"],
      image: "assets/floorplans/38.34-studio.jpg",
    },
    {
      area: 58.37,
      rooms: 2,
      block: ["1", "6", "9", "10"],
      image: "assets/floorplans/58.37.jpg",
    },
    {
      area: 59.03,
      rooms: 2,
      block: ["1", "6", "9", "10"],
      image: "assets/floorplans/59.03.jpg",
    },
    {
      area: 80.39,
      rooms: 3,
      block: ["1", "6", "9", "10"],
      image: "assets/floorplans/80.39.jpg",
    },

    // The other 10 (typical) blocks share this set instead.
    {
      area: 38.34,
      rooms: 2,
      block: ["2", "3", "4", "5", "7", "8", "11", "12", "13", "14"],
      image: "assets/floorplans/38.34-euro.jpg",
    },
    {
      area: 63,
      rooms: 2,
      block: ["2", "3", "4", "5", "7", "8", "11", "12", "13", "14"],
      image: "assets/floorplans/63.jpg",
    },
    {
      area: 63.74,
      rooms: 3,
      block: ["2", "3", "4", "5", "7", "8", "11", "12", "13", "14"],
      image: "assets/floorplans/63.74-euro.jpg",
    },
    {
      area: 90.01,
      rooms: 4,
      block: ["2", "3", "4", "5", "7", "8", "11", "12", "13", "14"],
      image: "assets/floorplans/90.01.jpg",
    },
  ],
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
