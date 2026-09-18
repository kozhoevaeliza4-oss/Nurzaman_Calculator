import { parseTabularFile, parsePdfText } from '../imports/file-parser.util';
import { mapBankHeaders } from '../imports/column-mapper.util';

export interface RawTransactionRow {
  date: string;
  amount: string;
  payerName: string;
  purpose: string;
  transactionRef: string;
}

export async function parseBankStatement(buffer: Buffer, filename: string): Promise<RawTransactionRow[]> {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return parsePdfBankStatementFromBuffer(buffer);

  const table = await parseTabularFile(buffer, filename);
  const fieldByColumn = mapBankHeaders(table.headers);

  return table.rows.map((rawRow) => {
    const row: Record<string, string> = {};
    rawRow.forEach((value, colIndex) => {
      const field = fieldByColumn[colIndex];
      if (field) row[field] = value;
    });
    return {
      date: row.date ?? '',
      amount: row.amount ?? '',
      payerName: row.payerName ?? '',
      purpose: row.purpose ?? '',
      transactionRef: row.transactionRef ?? '',
    };
  });
}

// Best-effort: a bank statement PDF has no reliable table structure once
// text-extracted, so this looks for lines that contain both a date and an
// amount and treats everything else on the line as payer/purpose. Works
// for simple one-transaction-per-line statements; anything fancier
// (multi-line entries, columns that don't align in the text stream) will
// need the Excel/CSV export instead - the ТЗ itself flags PDF as
// "желательно, но не критично".
async function parsePdfBankStatementFromBuffer(buffer: Buffer): Promise<RawTransactionRow[]> {
  const text = await parsePdfText(buffer);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const dateRe = /(\d{1,2}[./]\d{1,2}[./]\d{2,4})/;
  const amountRe = /([\d\s]{2,}[.,]\d{2})(?!\d)/;

  const rows: RawTransactionRow[] = [];
  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    const amountMatch = line.match(amountRe);
    if (!dateMatch || !amountMatch) continue;

    const remainder = line
      .replace(dateMatch[0], '')
      .replace(amountMatch[0], '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    rows.push({
      date: dateMatch[1],
      amount: amountMatch[1],
      payerName: remainder,
      purpose: remainder,
      transactionRef: '',
    });
  }
  return rows;
}
