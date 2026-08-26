/**
 * Builds the client-facing PDF: a personal "your future home" calculation
 * laid out as a single premium document across exactly 2 pages:
 *
 *   1. The apartment and the money — a navy cover band with the title,
 *      project name, apartment data, financial breakdown, and the
 *      monthly payment as the big closing accent.
 *   2. The apartment and its place — genplan (block highlighted) next
 *      to the location/infrastructure map, the 3D floor plan large and
 *      full-width, then client + manager contacts and the calc date.
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
  grayLight: [225, 228, 233],
  cardBg: [247, 248, 250],
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

function drawSectionHeading(doc, y, ky, ru, pageWidth) {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(`${ky} / ${ru}`.toUpperCase(), PDF_MARGIN, y);
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(PDF_MARGIN, y + 1.8, PDF_MARGIN + 16, y + 1.8);
  return y + 7;
}

/**
 * One unified "contact" card holding client + manager side by side inside
 * a single frame (a shared card, not two separate ones) so the last block
 * on page 2 reads as one closing element instead of two loose boxes.
 */
function drawUnifiedContactCard(doc, x, y, width, left, right) {
  const rowHeight = 5.4;
  const rows = Math.max(left.rows.length, right.rows.length, 1);
  const cardHeight = 9.5 + rows * rowHeight;

  doc.setFillColor(...PDF_COLORS.cardBg);
  doc.roundedRect(x, y, width, cardHeight, 3, 3, "F");

  const halfWidth = width / 2;
  const dividerX = x + halfWidth;

  [
    { originX: x, data: left },
    { originX: dividerX, data: right },
  ].forEach(({ originX, data }) => {
    let innerY = y + 7.5;
    doc.setFont("Roboto", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(`${data.ky} / ${data.ru}`.toUpperCase(), originX + 7, innerY);
    innerY += 5.6;
    data.rows.forEach(([label, value]) => {
      doc.setFont("Roboto", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(label, originX + 7, innerY);
      doc.setFont("Roboto", "bold");
      doc.setFontSize(8.8);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.text(value, originX + halfWidth - 7, innerY, { align: "right" });
      innerY += rowHeight;
    });
  });

  doc.setDrawColor(...PDF_COLORS.grayLight);
  doc.setLineWidth(0.3);
  doc.line(dividerX, y + 5, dividerX, y + cardHeight - 5);

  return cardHeight;
}

/** Compact "at a glance" apartment parameter card: big value, small label. */
function drawParamCard(doc, x, y, width, height, value, ky, ru) {
  doc.setFillColor(...PDF_COLORS.cardBg);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "F");
  doc.setFillColor(...PDF_COLORS.gold);
  doc.rect(x, y, width, 1.2, "F");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(value, x + width / 2, y + height / 2 + 2, { align: "center" });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`${ky} / ${ru}`.toUpperCase(), x + width / 2, y + height - 5.5, { align: "center" });
}

/**
 * The financial breakdown drawn as one visually connected flow (a single
 * card with a gold "timeline" down the left edge) instead of a plain list
 * of rows, so cost -> down payment -> remainder -> term reads as one chain
 * leading into the monthly payment box below it.
 */
function drawFinanceFlowCard(doc, x, y, width, rows) {
  const rowHeight = 11.5;
  const paddingTop = 10;
  const cardHeight = paddingTop + rows.length * rowHeight + 6;

  doc.setFillColor(...PDF_COLORS.cardBg);
  doc.roundedRect(x, y, width, cardHeight, 3, 3, "F");

  const dotX = x + 9;
  const lineTop = y + paddingTop - 1;
  const lineBottom = y + paddingTop + (rows.length - 1) * rowHeight + 1;
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.4);
  doc.line(dotX, lineTop, dotX, lineBottom);

  let rowY = y + paddingTop;
  rows.forEach(([label, value], i) => {
    const isLast = i === rows.length - 1;
    doc.setFillColor(...(isLast ? PDF_COLORS.gold : PDF_COLORS.white));
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.4);
    doc.circle(dotX, rowY, 1.3, isLast ? "F" : "FD");

    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(label, dotX + 6, rowY + 1);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(value, x + width - 7, rowY + 1, { align: "right" });
    rowY += rowHeight;
  });

  return cardHeight;
}

/** Draws one infrastructure category (bilingual label + wrapped item list) in a column. Returns the bottom y. */
function drawInfraColumn(doc, x, y, width, category) {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.navy);
  const headerLines = doc.splitTextToSize(`${category.ru} / ${category.ky}`, width);
  headerLines.forEach((line, i) => doc.text(line, x, y + i * 3.6));
  let cy = y + headerLines.length * 3.6 + 2;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(6.9);
  doc.setTextColor(...PDF_COLORS.gray);
  category.items.forEach((item) => {
    const lines = doc.splitTextToSize(`•  ${item}`, width);
    lines.forEach((line, i) => doc.text(line, x, cy + i * 3.2));
    cy += lines.length * 3.2 + 0.8;
  });

  return cy;
}

/** Draws the fit-out checklist in N columns. Returns the bottom y. */
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
      doc.setFontSize(7.8);
      doc.setTextColor(...PDF_COLORS.navy);
      const lines = doc.splitTextToSize(item.ru, colWidth - 6);
      lines.forEach((line, i) => doc.text(line, colX + 5.5, cy + i * 3.5));
      cy += lines.length * 3.5 + 1.8;
    });
    maxBottom = Math.max(maxBottom, cy);
  }
  return maxBottom;
}

function buildOfferPdfFileName() {
  return "Nurzaman_EK_Расчет.pdf";
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

  // ================= PAGE 1 — Квартира и деньги =================
  // Компактная иерархия: дом -> квартира -> стоимость -> взнос -> платёж.
  const bannerHeight = 34;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.rect(0, 0, pageWidth, bannerHeight, "F");

  const logoHeight1 = 8;
  const logoWidth1 = (logo.width / logo.height) * logoHeight1;
  doc.addImage(logo.dataUrl, "PNG", margin, 9, logoWidth1, logoHeight1, undefined, "FAST");

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text("БОЛОЧОК ҮЙҮҢҮЗДҮН ЭСЕБИ", pageWidth / 2, 15, { align: "center" });
  doc.setFont("Roboto", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("РАСЧЁТ ВАШЕГО БУДУЩЕГО ДОМА", pageWidth / 2, 23.5, { align: "center" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(190, 200, 218);
  doc.text(CONFIG.project.name, pageWidth / 2, 29.5, { align: "center" });

  let y = bannerHeight + 12;

  // --- Квартира: компактные карточки-параметры (63 м² / 2 комнаты / 5 этаж / блок 12) ---
  const paramDefs = [
    [`${formatNumber(input.area)} м²`, "Аянты", "Площадь"],
    extras.rooms ? [`${extras.rooms}`, "Бөлмө", "Комнат"] : null,
    extras.floor ? [`${extras.floor}`, "Кабат", "Этаж"] : null,
    extras.block ? [`${extras.block}`, "Блок", "Блок"] : null,
  ].filter(Boolean);

  const paramGap = 6;
  const paramHeight = 24;
  const paramWidth = (contentWidth - paramGap * (paramDefs.length - 1)) / paramDefs.length;
  paramDefs.forEach(([value, ky, ru], i) => {
    drawParamCard(doc, margin + i * (paramWidth + paramGap), y, paramWidth, paramHeight, value, ky, ru);
  });
  y += paramHeight + 12;

  // --- Финансовый расчёт: единая карточка-цепочка, ведущая к платежу ---
  y = drawSectionHeading(doc, y, "Каржылык эсеп", "Финансовый расчёт", pageWidth);

  const financeRows = [
    ["Батирдин баасы / Стоимость квартиры", formatCurrency(result.totalPrice, currency)],
    ["Баштапкы төлөм / Первоначальный взнос", formatCurrency(result.downPayment, currency)],
    ["Төлөнө турган калдык / Остаток к оплате", formatCurrency(result.remainder, currency)],
    ["Бөлүп төлөө мөөнөтү / Срок рассрочки", `${input.termMonths} ай / мес.`],
  ];
  const financeCardHeight = drawFinanceFlowCard(doc, margin, y, contentWidth, financeRows);
  y += financeCardHeight + 8;

  // --- Ежемесячный платёж: главный визуальный акцент страницы ---
  // Clamped height: big enough to dominate the page, but capped so it
  // never turns into a slab of mostly-empty navy space when the content
  // above is short — any extra leftover becomes quiet breathing room
  // above the box instead of dead space inside it.
  const boxHeight = Math.min(78, Math.max(62, pageHeight - margin - y));
  const boxY = pageHeight - margin - boxHeight;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.roundedRect(margin, boxY, contentWidth, boxHeight, 5, 5, "F");
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(margin + 10, boxY + 13, margin + 34, boxY + 13);
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("АЙ САЙЫНКЫ ТӨЛӨМ", margin + 10, boxY + 23);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(220, 226, 236);
  doc.text("Ежемесячный платёж", margin + 10, boxY + 29.5);

  // Мини-разбивка цепочки (стоимость -> взнос -> остаток -> срок), занимает
  // середину блока вместо пустоты — вертикально центрирована между
  // подзаголовком и крупной суммой, каким бы ни было итоговое boxHeight.
  const breakdown = [
    ["Стоимость", formatCurrency(result.totalPrice, currency)],
    ["Взнос", formatCurrency(result.downPayment, currency)],
    ["Остаток", formatCurrency(result.remainder, currency)],
    ["Срок", `${input.termMonths} мес.`],
  ];
  const breakdownY = boxY + 29.5 + (boxHeight - 29.5 - 32) / 2 + 8;
  const breakdownColWidth = contentWidth / breakdown.length;
  breakdown.forEach(([label, value], i) => {
    const colX = margin + i * breakdownColWidth;
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.gold);
    doc.text(label.toUpperCase(), colX, breakdownY);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text(value, colX, breakdownY + 5.5);
  });

  doc.setFont("Roboto", "bold");
  doc.setFontSize(40);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text(formatCurrency(result.monthlyPayment, currency), margin + 10, boxY + boxHeight - 12);

  // ================= PAGE 2 — Всё остальное, в парных колонках =================
  doc.addPage();

  const banner2Height = 20;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.rect(0, 0, pageWidth, banner2Height, "F");
  const logoHeight2 = 6.5;
  const logoWidth2 = (logo.width / logo.height) * logoHeight2;
  doc.addImage(logo.dataUrl, "PNG", margin, (banner2Height - logoHeight2) / 2, logoWidth2, logoHeight2, undefined, "FAST");
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("ЖАЙГАШУУСУ, ПЛАНДАР ЖАНА КОМПЛЕКТАЦИЯ", pageWidth - margin, 9, { align: "right" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(190, 200, 218);
  doc.text("Расположение, планировки и комплектация", pageWidth - margin, 14, { align: "right" });

  y = banner2Height + 8;

  const colGap = 10;
  const colWidth = (contentWidth - colGap) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + colGap;

  // --- Row 1: genplan + location map, side by side ---
  y = drawSectionHeading(doc, y, "Жайгашуусу", "Расположение", pageWidth);
  let rowBottom = y;

  const maxLocationHeight = 42;
  const blockRegion = getBlockRegion(extras.block);
  if (hasGenplanImage() && blockRegion) {
    const genplan = await loadImage(CONFIG.genplan.image);
    let gpWidth = colWidth;
    let gpHeight = (genplan.height / genplan.width) * gpWidth;
    if (gpHeight > maxLocationHeight) {
      gpHeight = maxLocationHeight;
      gpWidth = (genplan.width / genplan.height) * gpHeight;
    }
    doc.addImage(genplan.dataUrl, "JPEG", leftX, y, gpWidth, gpHeight, undefined, "MEDIUM");
    frameImage(doc, leftX, y, gpWidth, gpHeight);

    const strokeWidth = 0.45;
    const inset = 0.45;
    const rx = leftX + (blockRegion.x / 100) * gpWidth + inset;
    const ry = y + (blockRegion.y / 100) * gpHeight + inset;
    const rw = (blockRegion.width / 100) * gpWidth - inset * 2;
    const rh = (blockRegion.height / 100) * gpHeight - inset * 2;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(strokeWidth);
    doc.roundedRect(rx, ry, rw, rh, 1, 1, "S");

    const labelText = `Блок ${extras.block}`;
    doc.setFont("Roboto", "bold");
    doc.setFontSize(7.5);
    const labelWidth = doc.getTextWidth(labelText) + 5;
    const labelX = Math.min(Math.max(rx + rw / 2 - labelWidth / 2, leftX), leftX + gpWidth - labelWidth);
    const labelY = Math.max(ry - 5, y + 2);
    doc.setFillColor(...PDF_COLORS.gold);
    doc.roundedRect(labelX, labelY - 3.6, labelWidth, 4.8, 1.5, 1.5, "F");
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(labelText, labelX + labelWidth / 2, labelY, { align: "center" });

    rowBottom = Math.max(rowBottom, y + gpHeight);
  }

  if (CONFIG.project.locationMap) {
    const locMap = await loadImage(CONFIG.project.locationMap);
    let lmWidth = colWidth;
    let lmHeight = (locMap.height / locMap.width) * lmWidth;
    if (lmHeight > maxLocationHeight) {
      lmHeight = maxLocationHeight;
      lmWidth = (locMap.width / locMap.height) * lmHeight;
    }
    doc.addImage(locMap.dataUrl, "JPEG", rightX, y, lmWidth, lmHeight, undefined, "MEDIUM");
    frameImage(doc, rightX, y, lmWidth, lmHeight);
    rowBottom = Math.max(rowBottom, y + lmHeight);
  }

  y = rowBottom + 5;

  // --- Row 2: nearby infrastructure, three columns ---
  const infra = CONFIG.project.infrastructure;
  if (infra) {
    y = drawSectionHeading(doc, y, "Инфраструктура", "Инфраструктура рядом", pageWidth);
    const infraGap = 7;
    const infraColWidth = (contentWidth - infraGap * 2) / 3;
    const categories = [infra.parks, infra.schools, infra.markets].filter(Boolean);
    let infraBottom = y;
    categories.forEach((cat, i) => {
      const colX = margin + i * (infraColWidth + infraGap);
      infraBottom = Math.max(infraBottom, drawInfraColumn(doc, colX, y, infraColWidth, cat));
    });
    y = infraBottom + 5;
  }

  // --- Row 3: 3D floor plan — large and full-width, the visual centerpiece ---
  const floorPlan = findFloorPlan(extras.block, input.area);
  if (floorPlan) {
    y = drawSectionHeading(doc, y, "Планировка", "Планировка квартиры", pageWidth);
    const plan = await loadImage(floorPlan.image);
    const maxFpHeight = 60;
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
  }

  // --- Row 4: fit-out checklist, full-width in 2 columns ---
  const komplectation = CONFIG.project.komplectation;
  if (komplectation && komplectation.length > 0) {
    y = drawSectionHeading(doc, y, "Комплектация", "Комплектация", pageWidth);
    y = drawKomplectationColumns(doc, margin, y, contentWidth, komplectation, 2) + 5;
  }

  // --- Row 5: client + manager, as one unified contact block ---
  const clientRows = [];
  if (extras.clientName) clientRows.push(["Аты / Имя", extras.clientName]);
  if (extras.clientPhone) clientRows.push(["Телефону / Телефон", extras.clientPhone]);
  const managerRows = [];
  if (extras.managerName) managerRows.push(["Аты / Имя", extras.managerName]);
  if (extras.managerPhone) managerRows.push(["Телефону / Телефон", extras.managerPhone]);

  if (clientRows.length > 0 || managerRows.length > 0) {
    const h = drawUnifiedContactCard(doc, margin, y, contentWidth, { ky: "Кардар", ru: "Клиент", rows: clientRows }, {
      ky: "Менеджер",
      ru: "Менеджер",
      rows: managerRows,
    });
    y += h + 4;
  }

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`Эсептин күнү / Дата расчёта: ${formatCalculationDate()}`, pageWidth / 2, y, { align: "center" });

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
