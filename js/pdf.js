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
  leopardBase: [244, 227, 200],
  leopardSpot: [107, 68, 35],
};

let cachedLogoDataUrl = null;
let cachedRenderDataUrl = null;

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

function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = dataUrl;
  });
}

async function getBrandAssets() {
  if (!cachedLogoDataUrl) {
    cachedLogoDataUrl = await fetchAsDataURL(CONFIG.brand.logo);
  }
  if (!cachedRenderDataUrl) {
    cachedRenderDataUrl = await fetchAsDataURL(CONFIG.project.render);
  }
  return { logo: cachedLogoDataUrl, render: cachedRenderDataUrl };
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

/**
 * @param {Object} params
 * @param {import('./calculator').InstallmentInput} params.input
 * @param {import('./calculator').InstallmentResult} params.result
 * @param {string} params.currency
 * @returns {Promise<import('jspdf').jsPDF>}
 */
async function buildOfferPdf({ input, result, currency }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  registerFonts(doc);

  const { logo, render } = await getBrandAssets();
  const [logoDim, renderDim] = await Promise.all([
    getImageDimensions(logo),
    getImageDimensions(render),
  ]);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // Header: logo + offer title
  const logoWidth = 34;
  const logoHeight = (logoDim.height / logoDim.width) * logoWidth;
  doc.addImage(logo, "PNG", margin, y, logoWidth, logoHeight, undefined, "FAST");

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
  const imgHeight = (renderDim.height / renderDim.width) * imgWidth;
  doc.addImage(render, "JPEG", margin, y, imgWidth, imgHeight, undefined, "MEDIUM");
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

  // Spec rows
  const rows = [
    [
      "Батирдин аянты, м² / Площадь квартиры",
      `${formatNumber(input.area)} м²`,
    ],
    ["1 м² баасы / Цена за м²", formatCurrency(input.pricePerM2, currency)],
    [
      "Бөлүп төлөө мөөнөтү / Срок рассрочки",
      `${input.termMonths} ай / ${input.termMonths} мес.`,
    ],
    ["Батирдин баасы / Стоимость квартиры", formatCurrency(result.totalPrice, currency)],
    ["Баштапкы төлөм / Первоначальный взнос", formatCurrency(result.downPayment, currency)],
    ["Төлөнө турган калдык / Остаток к оплате", formatCurrency(result.remainder, currency)],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(label, margin, y);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 7;
    doc.setDrawColor(245, 246, 248);
    doc.line(margin, y - 2.3, pageWidth - margin, y - 2.3);
  });

  y += 5;

  // Highlighted monthly payment box — the main focal point of the offer
  const boxHeight = 34;
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

  // Footer
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
  module.exports = { buildOfferPdf };
}
