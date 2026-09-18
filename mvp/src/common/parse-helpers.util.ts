// Loose parsing helpers for values coming out of user-uploaded
// spreadsheets, which are never as clean as a form input.

export function parseAmount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[^\d.,-]/g, '')
    .replace(/\s/g, '');
  if (!cleaned) return null;
  // Handle "12.000,50" (thousands dot, decimal comma) vs "12,000.50" vs
  // plain "12000" - if there's both a comma and a dot, the rightmost one
  // is the decimal separator.
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (lastComma > -1) {
    normalized = cleaned.replace(',', '.');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const MONTH_NAMES: Record<string, number> = {
  январь: 1, января: 1, янв: 1,
  февраль: 2, февраля: 2, фев: 2,
  март: 3, марта: 3, мар: 3,
  апрель: 4, апреля: 4, апр: 4,
  май: 5, мая: 5,
  июнь: 6, июня: 6, июн: 6,
  июль: 7, июля: 7, июл: 7,
  август: 8, августа: 8, авг: 8,
  сентябрь: 9, сентября: 9, сен: 9, сент: 9,
  октябрь: 10, октября: 10, окт: 10,
  ноябрь: 11, ноября: 11, ноя: 11,
  декабрь: 12, декабря: 12, дек: 12,
};

// Returns an ISO 'YYYY-MM-DD' date, or null if unparseable. Accepts
// 'DD.MM.YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', and already-ISO strings.
export function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

// Extracts a 'YYYY-MM' period from free text like "Оплата за сентябрь"
// or "09.2026" - ТЗ раздел 9 ("Определение месяца оплаты").
export function extractPeriodFromText(text: string, fallbackYear: number): string | null {
  const lower = text.toLowerCase().replace(/ё/g, 'е');

  const numeric = lower.match(/(\d{1,2})[./](\d{4})/);
  if (numeric) {
    const month = Number(numeric[1]);
    if (month >= 1 && month <= 12) return `${numeric[2]}-${String(month).padStart(2, '0')}`;
  }

  for (const [name, month] of Object.entries(MONTH_NAMES)) {
    if (lower.includes(name)) {
      const yearMatch = lower.match(/20\d{2}/);
      const year = yearMatch ? yearMatch[0] : String(fallbackYear);
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }
  return null;
}
