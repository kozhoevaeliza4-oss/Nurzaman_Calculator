/**
 * Builds the client-facing PDF: a personal "your future home" calculation
 * rather than a generic commercial offer. Pure PDF-drawing logic — no DOM
 * reads happen here, the caller passes in already-validated input and a
 * computed result (see calculator.js). Kept separate from app.js so the
 * layout can evolve without touching the calculator or the DOM binding
 * layer.
 *
 * Layout is deliberately fixed at exactly two pages:
 *  - Page 1: brand header, a small render, apartment data, the financial
 *    breakdown, and the monthly payment anchored large at the bottom.
 *  - Page 2: genplan (with the block highlighted), the matched floor
 *    plan, then client and manager contacts.
 * Nothing here changes the calculator's math or the genplan/floor-plan
 * matching logic — both are read as-is from calculator.js / genplan.js /
 * floorplans.js.
 */

const PDF_COLORS = {
  navy: [11, 31, 58],
  gray: [139, 147, 161],
  grayLight: [225, 228, 233],
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
  const spots = [
    [x + 5, yCenter - 1, 0.5],
    [x + 10.5, yCenter + 0.9, 0.4],
    [x + 16, yCenter - 1.4, 0.55],
    [x + 22, yCenter + 0.7, 0.38],
    [x + 27.5, yCenter - 0.9, 0.45],
  ];
  spots.forEach(([sx, sy, r]) => doc.circle(sx, sy, r, "F"));

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.leopardSpot);
  doc.text(label, x + width / 2, yCenter + 1, { align: "center" });
}

function drawSectionHeading(doc, y, ky, ru) {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`${ky} / ${ru}`.toUpperCase(), PDF_MARGIN, y);
  return y + 6;
}

function drawRow(doc, y, pageWidth, label, value, rowHeight) {
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(label, PDF_MARGIN, y);
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(value, pageWidth - PDF_MARGIN, y, { align: "right" });
  y += rowHeight;
  doc.setDrawColor(245, 246, 248);
  doc.line(PDF_MARGIN, y - rowHeight * 0.33, pageWidth - PDF_MARGIN, y - rowHeight * 0.33);
  return y;
}

/** Auto-generated PDF file name. */
function buildOfferPdfFileName() {
  return "Nurzaman_EK_Расчет.pdf";
}

/**
 * @param {Object} state
 * @param {import('./calculator').InstallmentInput} state.input
 * @param {import('./calculator').InstallmentResult} state.result
 * @param {string} state.currency
 * @param {Object} [state.extras] apartment identity + client/manager contacts
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

  const [logo, render] = await Promise.all([
    loadImage(CONFIG.brand.logo),
    loadImage(CONFIG.project.render),
  ]);

  // ---------- PAGE 1: the personal calculation ----------
  let y = margin;

  const logoWidth = 26;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  doc.addImage(logo.dataUrl, "PNG", margin, y, logoWidth, logoHeight, undefined, "FAST");
  y += Math.max(logoHeight, 6) + 7;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text("БОЛОЧОК ҮЙҮҢҮЗДҮН ЭСЕБИ", pageWidth / 2, y, { align: "center" });
  y += 8.5;

  doc.setFontSize(13);
  doc.text("РАСЧЁТ ВАШЕГО БУДУЩЕГО ДОМА", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text("Сиздин болочок үйүңүз ушул эсептен башталат", pageWidth / 2, y, { align: "center" });
  y += 4.6;
  doc.text("Ваш будущий дом начинается с этого расчёта", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setDrawColor(...PDF_COLORS.grayLight);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // A small render — this page is about the client's numbers, not the
  // building, so the image stays modest and centered.
  const renderWidth = 92;
  const renderHeight = (render.height / render.width) * renderWidth;
  doc.addImage(render.dataUrl, "JPEG", (pageWidth - renderWidth) / 2, y, renderWidth, renderHeight, undefined, "MEDIUM");
  y += renderHeight + 7;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(CONFIG.project.name, pageWidth / 2, y, { align: "center" });
  y += 8;

  // Apartment data — area always shown (it's always known by this point);
  // block/floor/rooms only when the manager filled them in.
  const apartmentRows = [[`Батирдин аянты, м² / Площадь, м²`, `${formatNumber(input.area)} м²`]];
  if (extras.block) apartmentRows.push(["Блок / Блок", extras.block]);
  if (extras.floor) apartmentRows.push(["Кабат / Этаж", extras.floor]);
  if (extras.rooms) apartmentRows.push(["Бөлмө саны / Комнат", extras.rooms]);

  y = drawSectionHeading(doc, y, "Батирдин маалыматы", "Данные квартиры");
  apartmentRows.forEach(([label, value]) => {
    y = drawRow(doc, y, pageWidth, label, value, 7);
  });
  y += 4;

  const financeRows = [
    ["1 м² баасы / Цена за м²", formatCurrency(input.pricePerM2, currency)],
    ["Батирдин баасы / Стоимость квартиры", formatCurrency(result.totalPrice, currency)],
    ["Баштапкы төлөм / Первоначальный взнос", formatCurrency(result.downPayment, currency)],
    ["Төлөнө турган калдык / Остаток к оплате", formatCurrency(result.remainder, currency)],
    ["Бөлүп төлөө мөөнөтү / Срок рассрочки", `${input.termMonths} ай / ${input.termMonths} мес.`],
  ];

  y = drawSectionHeading(doc, y, "Каржылык эсеп", "Финансовый расчёт");
  financeRows.forEach(([label, value]) => {
    y = drawRow(doc, y, pageWidth, label, value, 7);
  });

  // The monthly payment is the emotional core of the document, so it's
  // anchored to a fixed spot near the bottom of the page — big, on its
  // own, regardless of how much (or little) sits above it.
  const boxHeight = 62;
  const boxY = pageHeight - margin - boxHeight;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.roundedRect(margin, boxY, contentWidth, boxHeight, 5, 5, "F");

  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(margin + 10, boxY + 15, margin + 34, boxY + 15);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("АЙ САЙЫНКЫ ТӨЛӨМ", margin + 10, boxY + 26);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 226, 236);
  doc.text("Ежемесячный платёж", margin + 10, boxY + 33);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(42);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(formatCurrency(result.monthlyPayment, currency), margin + 10, boxY + 54);

  // ---------- PAGE 2: genplan, floor plan, contacts ----------
  doc.addPage();
  y = margin;

  const blockRegion = getBlockRegion(extras.block);
  if (hasGenplanImage() && blockRegion) {
    const genplan = await loadImage(CONFIG.genplan.image);
    const gpWidth = 132;
    const gpHeight = (genplan.height / genplan.width) * gpWidth;
    const gpX = (pageWidth - gpWidth) / 2;

    y = drawSectionHeading(doc, y, "Генплан", "Генплан");

    doc.addImage(genplan.dataUrl, "JPEG", gpX, y, gpWidth, gpHeight, undefined, "MEDIUM");

    // A small inward inset + thinner stroke than the on-screen CSS
    // highlight: at this image size a 1mm centered stroke would put a
    // visible sliver of the line itself past the block's edge, which
    // reads as "touching the neighbor" even though the rectangle's own
    // coordinates are correct.
    const strokeWidth = 0.5;
    const inset = 0.5;
    const rx = gpX + (blockRegion.x / 100) * gpWidth + inset;
    const ry = y + (blockRegion.y / 100) * gpHeight + inset;
    const rw = (blockRegion.width / 100) * gpWidth - inset * 2;
    const rh = (blockRegion.height / 100) * gpHeight - inset * 2;

    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(strokeWidth);
    doc.roundedRect(rx, ry, rw, rh, 1.2, 1.2, "S");

    const labelText = `Блок ${extras.block}`;
    doc.setFont("Roboto", "bold");
    doc.setFontSize(8.5);
    const labelWidth = doc.getTextWidth(labelText) + 6;
    const labelX = Math.min(Math.max(rx + rw / 2 - labelWidth / 2, gpX), gpX + gpWidth - labelWidth);
    const labelY = Math.max(ry - 6, y + 2);
    doc.setFillColor(...PDF_COLORS.gold);
    doc.roundedRect(labelX, labelY - 4, labelWidth, 5.5, 2, 2, "F");
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(labelText, labelX + labelWidth / 2, labelY, { align: "center" });

    y += gpHeight + 8;
  }

  // Floor plan matched by block + exact area — large and unobscured,
  // since this is the second half of "what am I actually buying". If
  // there's no exact match, the section is skipped entirely rather than
  // showing a "not found" note in a document that goes to the client.
  const floorPlan = findFloorPlan(extras.block, input.area);
  if (floorPlan) {
    const plan = await loadImage(floorPlan.image);
    const fpWidth = 156;
    const fpHeight = (plan.height / plan.width) * fpWidth;
    const fpX = (pageWidth - fpWidth) / 2;

    y = drawSectionHeading(doc, y, "Планировка", "Планировка");
    doc.addImage(plan.dataUrl, "JPEG", fpX, y, fpWidth, fpHeight, undefined, "MEDIUM");
    y += fpHeight + 8;
  }

  const clientRows = [];
  if (extras.clientName) clientRows.push(["Аты / Имя", extras.clientName]);
  if (extras.clientPhone) clientRows.push(["Телефону / Телефон", extras.clientPhone]);

  if (clientRows.length > 0) {
    y = drawSectionHeading(doc, y, "Кардар", "Клиент");
    clientRows.forEach(([label, value]) => {
      y = drawRow(doc, y, pageWidth, label, value, 6.5);
    });
    y += 3;
  }

  const managerRows = [];
  if (extras.managerName) managerRows.push(["Аты / Имя", extras.managerName]);
  if (extras.managerPhone) managerRows.push(["Телефону / Телефон", extras.managerPhone]);

  if (managerRows.length > 0) {
    y = drawSectionHeading(doc, y, "Менеджер", "Менеджер");
    managerRows.forEach(([label, value]) => {
      y = drawRow(doc, y, pageWidth, label, value, 6.5);
    });
    y += 3;
  }

  // Footer signature, anchored to the bottom of page 2 so it never
  // shifts the layout above and never spills onto a third page.
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
