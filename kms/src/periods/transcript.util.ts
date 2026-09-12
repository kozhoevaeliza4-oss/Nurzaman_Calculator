import { join } from 'path';
import PDFDocument from 'pdfkit';

export interface TranscriptRow {
  subjectName: string;
  finalValue: number;
}

// Module 20: "Табель/выписка успеваемости за период — выгрузка для
// родителя (PDF)." pdfkit's built-in fonts have no Cyrillic glyphs, so a
// bundled DejaVu Sans (shipped under kms/assets/fonts, see Dockerfile) is
// registered explicitly.
export function buildTranscriptPdf(params: {
  studentName: string;
  periodName: string;
  academicYear: string;
  className: string;
  rows: TranscriptRow[];
}): Promise<Buffer> {
  const fontDir = join(process.cwd(), 'assets', 'fonts');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.registerFont('base', join(fontDir, 'DejaVuSans.ttf'));
  doc.registerFont('base-bold', join(fontDir, 'DejaVuSans-Bold.ttf'));

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.font('base-bold').fontSize(18).text('Асыл-Аманат Школа', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('base-bold').fontSize(14).text('Табель успеваемости', { align: 'center' });
  doc.moveDown(1);

  doc.font('base').fontSize(11);
  doc.text(`Ученик: ${params.studentName}`);
  doc.text(`Класс: ${params.className}`);
  doc.text(`Период: ${params.periodName} (${params.academicYear} уч. год)`);
  doc.moveDown(1);

  const colX = [doc.page.margins.left, 350];
  doc.font('base-bold');
  doc.text('Предмет', colX[0], doc.y, { continued: false });
  doc.text('Итоговая оценка', colX[1], doc.y - doc.currentLineHeight());
  doc.moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('base');
  for (const row of params.rows) {
    const y = doc.y;
    doc.text(row.subjectName, colX[0], y);
    doc.text(String(row.finalValue), colX[1], y);
    doc.moveDown(0.6);
  }

  if (params.rows.length === 0) {
    doc.font('base').fontSize(10).fillColor('#756A5C').text('Итоговых оценок за этот период пока нет.');
  }

  doc.end();
  return done;
}
