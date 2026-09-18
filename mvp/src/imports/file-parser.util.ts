import * as ExcelJS from 'exceljs';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { BadRequestException } from '@nestjs/common';

// Bank statement PDFs (module 5) aren't reliably tabular - this just gets
// the raw text out; line-by-line transaction extraction lives in
// transactions/bank-statement-parser.util.ts, which is where the format
// is actually understood.
export async function parsePdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text as string;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

// Reads whatever tabular file the user uploaded (module 3/5 of the ТЗ:
// "система должна уметь распознать" — the caller doesn't pick a format)
// into a plain headers+rows grid. The first non-empty row is treated as
// the header row.
export async function parseTabularFile(buffer: Buffer, filename: string): Promise<ParsedTable> {
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(buffer);
  }
  if (ext === 'csv') {
    return parseCsv(buffer.toString('utf-8'));
  }
  if (ext === 'docx') {
    return parseDocx(buffer);
  }
  throw new BadRequestException(
    `Неподдерживаемый формат файла: .${ext || '?'}. Поддерживаются: .xlsx, .xls, .csv, .docx`,
  );
}

async function parseExcel(buffer: Buffer): Promise<ParsedTable> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('В файле нет листов с данными');

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cellToString(cell.value));
    });
    if (cells.some((c) => c.trim() !== '')) grid.push(cells);
  });
  return gridToTable(grid);
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    // Rich text / formula result objects.
    const anyVal = value as any;
    if (anyVal.text) return String(anyVal.text);
    if (anyVal.result !== undefined) return cellToString(anyVal.result);
    if (Array.isArray(anyVal.richText)) return anyVal.richText.map((r: any) => r.text).join('');
    return '';
  }
  return String(value);
}

function parseCsv(text: string): ParsedTable {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const delimiter = lines[0]?.includes(';') && !lines[0]?.includes(',') ? ';' : ',';
  const grid = lines.map((line) => splitCsvLine(line, delimiter));
  return gridToTable(grid);
}

// Minimal CSV split that still respects double-quoted fields containing
// the delimiter - good enough for bank/accounting exports without pulling
// in a full CSV parsing dependency.
function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

async function parseDocx(buffer: Buffer): Promise<ParsedTable> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    throw new BadRequestException('В Word-документе не найдена таблица со списком');
  }
  const tableHtml = tableMatch[0];
  const rowMatches = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
  const grid = rowMatches.map((rowMatch) => {
    const cellMatches = [...rowMatch[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    return cellMatches.map((c) => stripHtml(c[1]).trim());
  });
  return gridToTable(grid);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function gridToTable(grid: string[][]): ParsedTable {
  if (grid.length === 0) return { headers: [], rows: [] };
  const width = Math.max(...grid.map((r) => r.length));
  const padded = grid.map((r) => {
    const row = [...r];
    while (row.length < width) row.push('');
    return row;
  });
  const [headers, ...rows] = padded;
  return { headers, rows };
}
