// Minimal, dependency-free CSV serializer — Excel opens CSV natively, so
// this covers Module 10's "выгрузка ... для руководителя и бухгалтера"
// without pulling in a full xlsx/pdf library. Swap in a proper
// spreadsheet/PDF library later if a formatted export is needed.
export function toCsv(rows: object[]): string {
  if (rows.length === 0) return '';
  const records = rows as Array<Record<string, unknown>>;
  const headers = Object.keys(records[0]);
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(',')];
  for (const row of records) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}
