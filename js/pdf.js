/**
 * Builds the client-facing PDF: a personal "your future home" calculation,
 * laid out as one deliberate composition across exactly 2 pages — not a
 * stack of interchangeable cards, but a single visual story per page with
 * one dominant element and everything else subordinate to it:
 *
 *   1. My apartment -> its cost -> my down payment -> my monthly payment.
 *      Every figure appears exactly once. The monthly payment is the
 *      single largest number in the whole document.
 *   2. My infrastructure -> my floor plan -> my fit-out -> my contact.
 *      The floor plan is the dominant visual of the page.
 *
 * Pure PDF-drawing logic — no DOM reads happen here, the caller passes in
 * already-validated input and a computed result (see calculator.js).
 * Kept separate from app.js so the layout can evolve without touching
 * the calculator or the genplan/floor-plan matching logic — none of
 * that math lives here or is changed by this file.
 */

const PDF_COLORS = {
  navy: [11, 31, 58],
  gray: [139, 147, 161],
  grayLight: [222, 226, 232],
  white: [255, 255, 255],
  gold: [242, 182, 50],
  leopardBase: [244, 227, 200],
  leopardSpot: [107, 68, 35],
};

const PDF_MARGIN = 15;

const assetCache = {};

function fetchAsDataURL(url) {
  return fetch(url)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

async function loadImage(url) {
  if (!assetCache[url]) {
    assetCache[url] = fetchAsDataURL(url).then(
      (dataUrl) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
          img.src = dataUrl;
        })
    );
  }
  return assetCache[url];
}

function registerFonts(doc) {
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");
}

function drawLeopardBadge(doc, x, yCenter, label) {
  const width = 34;
  const height = 6;
  doc.setFillColor(...PDF_COLORS.leopardBase);
  doc.roundedRect(x, yCenter - height / 2, width, height, height / 2, height / 2, "F");
  doc.setFillColor(...PDF_COLORS.leopardSpot);
  [
    [x + 5, yCenter - 1, 0.5],
    [x + 10.5, yCenter + 0.9, 0.4],
    [x + 16, yCenter - 1.4, 0.55],
    [x + 22, yCenter + 0.7, 0.38],
    [x + 27.5, yCenter - 0.9, 0.45],
  ].forEach(([sx, sy, r]) => doc.circle(sx, sy, r, "F"));
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.leopardSpot);
  doc.text(label, x + width / 2, yCenter + 1, { align: "center" });
}

/** A thin gold frame around a placed image — a small "framed photo" touch. */
function frameImage(doc, x, y, w, h) {
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, h, "S");
}

/** Section title: navy caps + a short gold underline. No card, no fill. */
function drawSectionHeading(doc, y, label, pageWidth, fontSize) {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(fontSize || 10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(label.toUpperCase(), PDF_MARGIN, y);
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(PDF_MARGIN, y + 2, PDF_MARGIN + 16, y + 2);
  return y + 7.5;
}

/**
 * The apartment at a glance — one unified strip (hairlines, not a filled
 * card) with the 4 params as equal segments, each a big value over a
 * small label, separated by thin vertical rules. Optionally leaves room
 * on the right for a genplan thumbnail passed in by the caller.
 */
function drawApartmentStrip(doc, x, y, width, height, params) {
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + width, y);
  doc.setDrawColor(...PDF_COLORS.grayLight);
  doc.setLineWidth(0.3);
  doc.line(x, y + height, x + width, y + height);

  const segWidth = width / params.length;
  const midY = y + height / 2;

  params.forEach(([value, label], i) => {
    const segX = x + i * segWidth;
    if (i > 0) {
      doc.setDrawColor(...PDF_COLORS.grayLight);
      doc.setLineWidth(0.3);
      doc.line(segX, y + 5, segX, y + height - 5);
    }
    doc.setFont("Roboto", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(value, segX + segWidth / 2, midY, { align: "center" });
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(label.toUpperCase(), segX + segWidth / 2, midY + 8.5, { align: "center" });
  });
}

/**
 * The financial story as one connected chain (a gold line + dots down the
 * left edge, no card fill) — cost -> down payment -> remainder -> term,
 * each shown exactly once. Label sits directly above its value at the
 * SAME x position, so each node reads as one paired unit instead of a
 * label-left/value-right table split across the page.
 */
function drawFinanceChain(doc, x, y, width, rows) {
  const rowHeight = 19;
  const dotX = x + 2;
  const textX = dotX + 8;
  const lineTop = y + 2;
  const lineBottom = y + (rows.length - 1) * rowHeight + 2;
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.4);
  doc.line(dotX, lineTop, dotX, lineBottom);

  let rowY = y;
  rows.forEach(([label, value], i) => {
    const isLast = i === rows.length - 1;
    doc.setFillColor(...(isLast ? PDF_COLORS.gold : PDF_COLORS.white));
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.4);
    doc.circle(dotX, rowY + 2, 1.5, isLast ? "F" : "FD");

    doc.setFont("Roboto", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(label.toUpperCase(), textX, rowY);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(value, textX, rowY + 9.5);
    rowY += rowHeight;
  });

  return y + (rows.length - 1) * rowHeight + 11;
}

/** Draws one infrastructure category (label + wrapped item list) in a column. Returns the bottom y. */
function drawInfraColumn(doc, x, y, width, title, items) {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8.3);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(title.toUpperCase(), x, y);
  let cy = y + 4.6;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(...PDF_COLORS.gray);
  items.forEach((item) => {
    const lines = doc.splitTextToSize(`•  ${item}`, width);
    lines.forEach((line, i) => doc.text(line, x, cy + i * 3.1));
    cy += lines.length * 3.1 + 0.6;
  });

  return cy;
}

/** Draws the fit-out checklist in N columns, as short single-accent-color checkmarks. Returns the bottom y. */
function drawKomplectationColumns(doc, x, y, totalWidth, items, columns) {
  const gap = 8;
  const colWidth = (totalWidth - gap * (columns - 1)) / columns;
  const perColumn = Math.ceil(items.length / columns);
  let maxBottom = y;

  for (let c = 0; c < columns; c++) {
    const colItems = items.slice(c * perColumn, (c + 1) * perColumn);
    let cy = y;
    const colX = x + c * (colWidth + gap);
    colItems.forEach((item) => {
      doc.setFont("Roboto", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.gold);
      doc.text("✓", colX, cy);
      doc.setFont("Roboto", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.navy);
      const lines = doc.splitTextToSize(item.ru, colWidth - 6);
      lines.forEach((line, i) => doc.text(line, colX + 5.5, cy + i * 3.3));
      cy += lines.length * 3.3 + 1.3;
    });
    maxBottom = Math.max(maxBottom, cy);
  }
  return maxBottom;
}

/**
 * Client + manager as a personal contact line, not a data table: a small
 * gold caption, a bold name, a gray phone — two columns, one thin hairline
 * above, no card fill.
 */
function drawPersonalContact(doc, x, y, width, left, right) {
  doc.setDrawColor(...PDF_COLORS.grayLight);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + width, y);

  const halfWidth = width / 2;
  let bottom = y;

  [
    { originX: x, data: left },
    { originX: x + halfWidth, data: right },
  ].forEach(({ originX, data }) => {
    if (!data.name && !data.phone) return;
    let innerY = y + 6.5;
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.gold);
    doc.text(data.caption.toUpperCase(), originX, innerY);
    innerY += 5.5;
    if (data.name) {
      doc.setFont("Roboto", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.text(data.name, originX, innerY);
      innerY += 5;
    }
    if (data.phone) {
      doc.setFont("Roboto", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(data.phone, originX, innerY);
      innerY += 4.5;
    }
    bottom = Math.max(bottom, innerY);
  });

  return bottom;
}

function buildOfferPdfFileName() {
  // Cyrillic in a dynamically-set <a download> filename gets silently
  // dropped by Chromium/Edge (the file saves as a plain "download" with
  // no name or extension) — keep this ASCII-only so the save always works.
  return "Nurzaman_EK_Raschet.pdf";
}

function formatCalculationDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * @param {Object} state
 * @param {import('./calculator').InstallmentInput} state.input
 * @param {import('./calculator').InstallmentResult} state.result
 * @param {string} state.currency
 * @param {Object} [state.extras]
 * @returns {Promise<import('jspdf').jsPDF>}
 */
async function buildOfferPdf({ input, result, currency, extras }) {
  extras = extras || {};

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN * 2;
  const margin = PDF_MARGIN;

  const logo = await loadImage(CONFIG.brand.logo);

  // ================= PAGE 1 — "МОЙ БУДУЩИЙ ДОМ" =================
  // Моя квартира -> её стоимость -> мой взнос -> мой платёж. Каждая
  // цифра встречается ровно один раз; платёж — крупнейший элемент PDF.
  const bannerHeight = 46;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.rect(0, 0, pageWidth, bannerHeight, "F");

  const logoHeight1 = 8;
  const logoWidth1 = (logo.width / logo.height) * logoHeight1;
  doc.addImage(logo.dataUrl, "PNG", margin, 9, logoWidth1, logoHeight1, undefined, "FAST");

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text("БОЛОЧОК ҮЙҮҢҮЗДҮН ЭСЕБИ", pageWidth / 2, 16, { align: "center" });
  doc.setFont("Roboto", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("РАСЧЁТ ВАШЕГО БУДУЩЕГО ДОМА", pageWidth / 2, 25, { align: "center" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 208, 224);
  doc.text("Ваш будущий дом начинается с этого расчёта", pageWidth / 2, 32, { align: "center" });
  doc.setFont("Roboto", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text(CONFIG.project.name, pageWidth / 2, 40.5, { align: "center" });

  let y = bannerHeight + 20;

  // --- Моя квартира: один компактный ряд с 4 параметрами + генплан ---
  const blockRegion = getBlockRegion(extras.block);
  const hasGenplan = hasGenplanImage() && blockRegion;
  const stripHeight = 34;
  const thumbGap = 8;
  const thumbWidth = hasGenplan ? 52 : 0;
  const stripWidth = contentWidth - (hasGenplan ? thumbWidth + thumbGap : 0);

  const paramDefs = [
    [`${formatNumber(input.area)} м²`, "Площадь"],
    extras.rooms ? [`${extras.rooms}`, "Комнаты"] : null,
    extras.floor ? [`${extras.floor}`, "Этаж"] : null,
    extras.block ? [`${extras.block}`, "Блок"] : null,
  ].filter(Boolean);
  drawApartmentStrip(doc, margin, y, stripWidth, stripHeight, paramDefs);

  if (hasGenplan) {
    const genplan = await loadImage(CONFIG.genplan.image);
    const thumbX = margin + stripWidth + thumbGap;
    let gpHeight = stripHeight;
    let gpWidth = (genplan.width / genplan.height) * gpHeight;
    if (gpWidth > thumbWidth) {
      gpWidth = thumbWidth;
      gpHeight = (genplan.height / genplan.width) * gpWidth;
    }
    const gpX = thumbX + (thumbWidth - gpWidth) / 2;
    const gpY = y + (stripHeight - gpHeight) / 2;
    doc.addImage(genplan.dataUrl, "JPEG", gpX, gpY, gpWidth, gpHeight, undefined, "MEDIUM");
    frameImage(doc, gpX, gpY, gpWidth, gpHeight);

    const inset = 0.4;
    const rx = gpX + (blockRegion.x / 100) * gpWidth + inset;
    const ry = gpY + (blockRegion.y / 100) * gpHeight + inset;
    const rw = (blockRegion.width / 100) * gpWidth - inset * 2;
    const rh = (blockRegion.height / 100) * gpHeight - inset * 2;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.45);
    doc.roundedRect(rx, ry, rw, rh, 1, 1, "S");
  }

  y += stripHeight + 18;

  // --- Ваш финансовый расчёт: одна цепочка, каждая цифра один раз ---
  y = drawSectionHeading(doc, y, "Ваш финансовый расчёт", pageWidth, 12);
  y += 3;

  const financeRows = [
    ["Стоимость квартиры", formatCurrency(result.totalPrice, currency)],
    ["Первоначальный взнос", formatCurrency(result.downPayment, currency)],
    ["Остаток к оплате", formatCurrency(result.remainder, currency)],
    ["Рассрочка", `${input.termMonths} месяцев`],
  ];
  y = drawFinanceChain(doc, margin, y, contentWidth, financeRows);
  y += 10;

  // --- Ежемесячный платёж: самый крупный элемент всего PDF, ровно один раз ---
  // The label + divider + number move as ONE group, vertically centered in
  // the box — so whatever the box's final height, there is no dead gap
  // between an anchored-top label and an anchored-bottom number.
  const boxHeight = 56;
  const boxY = y;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.roundedRect(margin, boxY, contentWidth, boxHeight, 4, 4, "F");

  const groupHeight = 40;
  const groupTop = boxY + (boxHeight - groupHeight) / 2;
  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("ЕЖЕМЕСЯЧНЫЙ ПЛАТЁЖ", margin + 10, groupTop + 5);
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(margin + 10, groupTop + 9, margin + 34, groupTop + 9);
  doc.setFont("Roboto", "bold");
  doc.setFontSize(54);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text(formatCurrency(result.monthlyPayment, currency), margin + 10, groupTop + 34);

  // ================= PAGE 2 — "ПОСМОТРИТЕ СВОЙ БУДУЩИЙ ДОМ" =================
  doc.addPage();

  const banner2Height = 20;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.rect(0, 0, pageWidth, banner2Height, "F");
  const logoHeight2 = 6.5;
  const logoWidth2 = (logo.width / logo.height) * logoHeight2;
  doc.addImage(logo.dataUrl, "PNG", margin, (banner2Height - logoHeight2) / 2, logoWidth2, logoHeight2, undefined, "FAST");
  doc.setFont("Roboto", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("ПЛАНЫ И КОМПЛЕКТАЦИЯ", pageWidth - margin, 9, { align: "right" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(190, 200, 218);
  doc.text("Инфраструктура, планировка и комплектация", pageWidth - margin, 14, { align: "right" });

  y = banner2Height + 10;

  // --- Где находится мой дом: генплан + карта, крупно, side by side ---
  const locColGap = 10;
  const locColWidth = (contentWidth - locColGap) / 2;
  const locLeftX = margin;
  const locRightX = margin + locColWidth + locColGap;

  y = drawSectionHeading(doc, y, "Где находится мой дом", pageWidth, 11) - 3;
  let locBottom = y;

  const maxLocHeight = 38;

  if (hasGenplan) {
    const genplan2 = await loadImage(CONFIG.genplan.image);
    let gp2Width = locColWidth;
    let gp2Height = (genplan2.height / genplan2.width) * gp2Width;
    if (gp2Height > maxLocHeight) {
      gp2Height = maxLocHeight;
      gp2Width = (genplan2.width / genplan2.height) * gp2Height;
    }
    doc.addImage(genplan2.dataUrl, "JPEG", locLeftX, y, gp2Width, gp2Height, undefined, "MEDIUM");
    frameImage(doc, locLeftX, y, gp2Width, gp2Height);

    const inset2 = 0.45;
    const rx2 = locLeftX + (blockRegion.x / 100) * gp2Width + inset2;
    const ry2 = y + (blockRegion.y / 100) * gp2Height + inset2;
    const rw2 = (blockRegion.width / 100) * gp2Width - inset2 * 2;
    const rh2 = (blockRegion.height / 100) * gp2Height - inset2 * 2;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(rx2, ry2, rw2, rh2, 1, 1, "S");

    const labelText2 = `Блок ${extras.block}`;
    doc.setFont("Roboto", "bold");
    doc.setFontSize(8);
    const labelWidth2 = doc.getTextWidth(labelText2) + 5;
    const labelX2 = Math.min(Math.max(rx2 + rw2 / 2 - labelWidth2 / 2, locLeftX), locLeftX + gp2Width - labelWidth2);
    const labelY2 = Math.max(ry2 - 5, y + 2);
    doc.setFillColor(...PDF_COLORS.gold);
    doc.roundedRect(labelX2, labelY2 - 3.8, labelWidth2, 5, 1.5, 1.5, "F");
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(labelText2, labelX2 + labelWidth2 / 2, labelY2, { align: "center" });

    locBottom = Math.max(locBottom, y + gp2Height);
  }

  if (CONFIG.project.locationMap) {
    const locMap = await loadImage(CONFIG.project.locationMap);
    let lmWidth = locColWidth;
    let lmHeight = (locMap.height / locMap.width) * lmWidth;
    if (lmHeight > maxLocHeight) {
      lmHeight = maxLocHeight;
      lmWidth = (locMap.width / locMap.height) * lmHeight;
    }
    doc.addImage(locMap.dataUrl, "JPEG", locRightX, y, lmWidth, lmHeight, undefined, "MEDIUM");
    frameImage(doc, locRightX, y, lmWidth, lmHeight);
    locBottom = Math.max(locBottom, y + lmHeight);
  }

  y = locBottom + 3;

  // --- Инфраструктура: компактно, 3 колонки, не половина страницы ---
  const infra = CONFIG.project.infrastructure;
  if (infra) {
    y = drawSectionHeading(doc, y, "Инфраструктура", pageWidth, 9.5);
    const infraGap = 9;
    const infraColWidth = (contentWidth - infraGap * 2) / 3;
    const categories = [infra.parks, infra.schools, infra.markets].filter(Boolean);
    let infraBottom = y;
    categories.forEach((cat, i) => {
      const colX = margin + i * (infraColWidth + infraGap);
      infraBottom = Math.max(infraBottom, drawInfraColumn(doc, colX, y, infraColWidth, cat.ru, cat.items));
    });
    y = infraBottom + 3;
  }

  // --- Планировка квартиры: главный визуал страницы, крупно ---
  const floorPlan = findFloorPlan(extras.block, input.area);
  if (floorPlan) {
    y = drawSectionHeading(doc, y, "Планировка квартиры", pageWidth, 12);
    y += 1;
    const plan = await loadImage(floorPlan.image);
    const maxFpHeight = 78;
    let fpWidth = contentWidth;
    let fpHeight = (plan.height / plan.width) * fpWidth;
    if (fpHeight > maxFpHeight) {
      fpHeight = maxFpHeight;
      fpWidth = (plan.width / plan.height) * fpHeight;
    }
    const fpX = margin + (contentWidth - fpWidth) / 2;
    doc.addImage(plan.dataUrl, "JPEG", fpX, y, fpWidth, fpHeight, undefined, "MEDIUM");
    frameImage(doc, fpX, y, fpWidth, fpHeight);
    y += fpHeight + 5;

    if (extras.rooms) {
      doc.setFont("Roboto", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.text(`${extras.rooms}-комнатная квартира · ${formatNumber(input.area)} м²`, pageWidth / 2, y, { align: "center" });
      y += 5;
    }
  }

  // --- Комплектация: короткий чек-лист в 2 колонки ---
  const komplectation = CONFIG.project.komplectation;
  if (komplectation && komplectation.length > 0) {
    y = drawSectionHeading(doc, y, "Комплектация", pageWidth, 9.5);
    y = drawKomplectationColumns(doc, margin, y, contentWidth, komplectation, 2) + 3;
  }

  // --- Клиент и менеджер: персональная связь, не таблица ---
  const clientData = { caption: "Ваш расчёт", name: extras.clientName, phone: extras.clientPhone };
  const managerData = { caption: "Ваш менеджер", name: extras.managerName, phone: extras.managerPhone };
  if (clientData.name || clientData.phone || managerData.name || managerData.phone) {
    y = drawPersonalContact(doc, margin, y, contentWidth, clientData, managerData) + 2;
  }

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`Дата расчёта: ${formatCalculationDate()}`, margin, y);

  const footerY = pageHeight - margin;
  doc.setDrawColor(...PDF_COLORS.grayLight);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`© Nurzaman, ${new Date().getFullYear()}`, margin, footerY - 2);
  drawLeopardBadge(doc, pageWidth - margin - 34, footerY - 3.5, "created by Elizka");

  return doc;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildOfferPdf, buildOfferPdfFileName };
}
