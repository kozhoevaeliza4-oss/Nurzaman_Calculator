/**
 * Builds the client-facing PDF offer card. Pure PDF-drawing logic — no
 * DOM reads happen here, the caller passes in already-validated input
 * and a computed result (see calculator.js). Kept separate from app.js
 * so the layout can evolve (e.g. per-project templates later) without
 * touching the calculator or the DOM binding layer.
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
  const width = 36;
  const height = 6.5;
  doc.setFillColor(...PDF_COLORS.leopardBase);
  doc.roundedRect(x, yCenter - height / 2, width, height, height / 2, height / 2, "F");

  doc.setFillColor(...PDF_COLORS.leopardSpot);
  const spots = [
    [x + 5, yCenter - 1.2, 0.55],
    [x + 11, yCenter + 1, 0.45],
    [x + 17, yCenter - 1.6, 0.6],
    [x + 23, yCenter + 0.8, 0.4],
    [x + 29, yCenter - 1, 0.5],
  ];
  spots.forEach(([sx, sy, r]) => doc.circle(sx, sy, r, "F"));

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.leopardSpot);
  doc.text(label, x + width / 2, yCenter + 1, { align: "center" });
}

/** Adds a page and resets `y` when the next block wouldn't fit. */
function ensureSpace(doc, y, needed, pageHeight) {
  if (y + needed > pageHeight - PDF_MARGIN) {
    doc.addPage();
    return PDF_MARGIN;
  }
  return y;
}

function drawSectionHeading(doc, y, ky, ru) {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`${ky} / ${ru}`.toUpperCase(), PDF_MARGIN, y);
  return y + 6;
}

function drawRow(doc, y, pageWidth, label, value) {
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(label, PDF_MARGIN, y);
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(value, pageWidth - PDF_MARGIN, y, { align: "right" });
  y += 7;
  doc.setDrawColor(245, 246, 248);
  doc.line(PDF_MARGIN, y - 2.3, pageWidth - PDF_MARGIN, y - 2.3);
  return y;
}

/**
 * Sanitizes a value for safe use inside a downloaded file name (strips
 * characters Windows/macOS forbid in file names).
 */
function sanitizeForFileName(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, "").trim();
}

/**
 * Builds the auto-generated PDF file name:
 * "Nurzaman_EK_Квартира_115_37.96м2.pdf" when an apartment number is set,
 * or "Nurzaman_EK_Расчет.pdf" otherwise.
 */
function buildOfferPdfFileName(state) {
  const apartmentNumber = state && state.extras && state.extras.apartmentNumber;
  if (apartmentNumber) {
    const area = state.input.area;
    const areaStr = Number.isFinite(area) ? String(Math.round(area * 100) / 100) : "";
    return `Nurzaman_EK_Квартира_${sanitizeForFileName(apartmentNumber)}_${areaStr}м2.pdf`;
  }
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

  let y = margin;

  // Header: logo + offer title
  const logoWidth = 34;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  doc.addImage(logo.dataUrl, "PNG", margin, y, logoWidth, logoHeight, undefined, "FAST");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text("Бөлүп төлөө боюнча сунуш", pageWidth - margin, y + 5, { align: "right" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text("Коммерческое предложение по рассрочке", pageWidth - margin, y + 10.5, {
    align: "right",
  });

  y += Math.max(logoHeight, 13) + 8;

  // Hero render image
  const imgWidth = contentWidth;
  const imgHeight = (render.height / render.width) * imgWidth;
  doc.addImage(render.dataUrl, "JPEG", margin, y, imgWidth, imgHeight, undefined, "MEDIUM");
  y += imgHeight + 7;

  // Project name
  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(CONFIG.project.name, margin, y);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text("Долбоор / Проект", pageWidth - margin, y, { align: "right" });
  y += 8;

  doc.setDrawColor(...PDF_COLORS.grayLight);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Apartment data — only the fields the manager actually filled in
  const apartmentRows = [];
  if (extras.block) apartmentRows.push(["Блок / Блок", extras.block]);
  if (extras.apartmentNumber) apartmentRows.push(["Батир № / Квартира №", extras.apartmentNumber]);
  if (extras.floor) apartmentRows.push(["Кабат / Этаж", extras.floor]);
  if (extras.rooms) apartmentRows.push(["Бөлмө саны / Комнат", extras.rooms]);

  if (apartmentRows.length > 0) {
    y = ensureSpace(doc, y, 6 + apartmentRows.length * 7, pageHeight);
    y = drawSectionHeading(doc, y, "Батирдин маалыматы", "Данные квартиры");
    apartmentRows.forEach(([label, value]) => {
      y = drawRow(doc, y, pageWidth, label, value);
    });
    y += 3;
  }

  // Financial rows
  const financeRows = [
    ["Батирдин аянты, м² / Площадь квартиры", `${formatNumber(input.area)} м²`],
    ["1 м² баасы / Цена за м²", formatCurrency(input.pricePerM2, currency)],
    ["Бөлүп төлөө мөөнөтү / Срок рассрочки", `${input.termMonths} ай / ${input.termMonths} мес.`],
    ["Батирдин баасы / Стоимость квартиры", formatCurrency(result.totalPrice, currency)],
    ["Баштапкы төлөм / Первоначальный взнос", formatCurrency(result.downPayment, currency)],
    ["Төлөнө турган калдык / Остаток к оплате", formatCurrency(result.remainder, currency)],
  ];

  y = ensureSpace(doc, y, 6 + financeRows.length * 7, pageHeight);
  y = drawSectionHeading(doc, y, "Каржылык эсеп", "Финансовый расчёт");
  financeRows.forEach(([label, value]) => {
    y = drawRow(doc, y, pageWidth, label, value);
  });

  y += 5;

  // Highlighted monthly payment box — the main focal point of the offer
  const boxHeight = 34;
  y = ensureSpace(doc, y, boxHeight, pageHeight);
  doc.setFillColor(...PDF_COLORS.navy);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, "F");

  doc.setFont("Roboto", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text("Ай сайынкы төлөм / Ежемесячный платеж", margin + 8, y + 12);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(24);
  doc.text(formatCurrency(result.monthlyPayment, currency), margin + 8, y + 25);

  y += boxHeight + 10;

  // Genplan with the selected block highlighted — only when both a real
  // genplan image and a known position for this block are configured.
  const blockRegion = getBlockRegion(extras.block);
  if (hasGenplanImage() && blockRegion) {
    const genplan = await loadImage(CONFIG.genplan.image);
    const gpWidth = contentWidth;
    const gpHeight = (genplan.height / genplan.width) * gpWidth;

    y = ensureSpace(doc, y, 6 + gpHeight + 6, pageHeight);
    y = drawSectionHeading(doc, y, "Генплан", "Генплан");

    doc.addImage(genplan.dataUrl, "JPEG", margin, y, gpWidth, gpHeight, undefined, "MEDIUM");

    const rx = margin + (blockRegion.x / 100) * gpWidth;
    const ry = y + (blockRegion.y / 100) * gpHeight;
    const rw = (blockRegion.width / 100) * gpWidth;
    const rh = (blockRegion.height / 100) * gpHeight;

    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(1);
    doc.roundedRect(rx, ry, rw, rh, 1.5, 1.5, "S");

    const labelText = `Блок ${extras.block}`;
    doc.setFont("Roboto", "bold");
    doc.setFontSize(8.5);
    const labelWidth = doc.getTextWidth(labelText) + 6;
    const labelX = Math.min(Math.max(rx + rw / 2 - labelWidth / 2, margin), margin + gpWidth - labelWidth);
    const labelY = Math.max(ry - 6, y + 2);
    doc.setFillColor(...PDF_COLORS.gold);
    doc.roundedRect(labelX, labelY - 4, labelWidth, 5.5, 2, 2, "F");
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(labelText, labelX + labelWidth / 2, labelY, { align: "center" });

    y += gpHeight + 8;
  }

  // Floor plan matched by block + exact area — omitted entirely (rather
  // than showing a "not found" note) when there's no exact match, since
  // this PDF goes straight to the client.
  const floorPlan = findFloorPlan(extras.block, input.area);
  if (floorPlan) {
    const plan = await loadImage(floorPlan.image);
    const fpWidth = Math.min(contentWidth, 100);
    const fpHeight = (plan.height / plan.width) * fpWidth;

    y = ensureSpace(doc, y, 6 + fpHeight, pageHeight);
    y = drawSectionHeading(doc, y, "Планировка", "Планировка");
    doc.addImage(plan.dataUrl, "JPEG", margin, y, fpWidth, fpHeight, undefined, "MEDIUM");
    y += fpHeight + 8;
  }

  // Client / manager contact details
  const clientRows = [];
  if (extras.clientName) clientRows.push(["Аты / Имя", extras.clientName]);
  if (extras.clientPhone) clientRows.push(["Телефону / Телефон", extras.clientPhone]);

  if (clientRows.length > 0) {
    y = ensureSpace(doc, y, 6 + clientRows.length * 7, pageHeight);
    y = drawSectionHeading(doc, y, "Кардар", "Клиент");
    clientRows.forEach(([label, value]) => {
      y = drawRow(doc, y, pageWidth, label, value);
    });
    y += 3;
  }

  const managerRows = [];
  if (extras.managerName) managerRows.push(["Аты / Имя", extras.managerName]);
  if (extras.managerPhone) managerRows.push(["Телефону / Телефон", extras.managerPhone]);

  if (managerRows.length > 0) {
    y = ensureSpace(doc, y, 6 + managerRows.length * 7, pageHeight);
    y = drawSectionHeading(doc, y, "Менеджер", "Менеджер");
    managerRows.forEach(([label, value]) => {
      y = drawRow(doc, y, pageWidth, label, value);
    });
    y += 3;
  }

  // Footer
  y = ensureSpace(doc, y, 14, pageHeight);
  doc.setDrawColor(...PDF_COLORS.grayLight);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`© Nurzaman, ${new Date().getFullYear()}`, margin, y + 1.5);

  drawLeopardBadge(doc, pageWidth - margin - 36, y + 1.5, "created by Elizka");

  return doc;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildOfferPdf, buildOfferPdfFileName };
}
