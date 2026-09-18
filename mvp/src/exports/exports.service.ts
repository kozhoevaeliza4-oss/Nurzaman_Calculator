import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Child, ChildStatus } from '../children/child.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { PaymentsService } from '../payments/payments.service';
import { DashboardService } from '../dashboard/dashboard.service';

// ТЗ раздел 20: Excel-экспорт по каждому разделу + один сводный PDF-отчёт.
@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Child) private readonly childrenRepo: Repository<Child>,
    private readonly paymentsService: PaymentsService,
    private readonly expensesService: ExpensesService,
    private readonly dashboardService: DashboardService,
  ) {}

  async childrenExcel(): Promise<Buffer> {
    const children = await this.childrenRepo.find({ order: { fullName: 'ASC' } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Дети');
    sheet.columns = [
      { header: 'ФИО', key: 'fullName', width: 28 },
      { header: 'Группа', key: 'groupName', width: 16 },
      { header: 'Оплата в месяц', key: 'monthlyFee', width: 16 },
      { header: 'Статус', key: 'status', width: 12 },
      { header: 'Родитель', key: 'parentName', width: 24 },
      { header: 'Телефон', key: 'parentPhone', width: 16 },
    ];
    for (const c of children) {
      sheet.addRow({
        fullName: c.fullName,
        groupName: c.groupName ?? '',
        monthlyFee: Number(c.monthlyFee),
        status: c.status === ChildStatus.ACTIVE ? 'Активен' : 'Неактивен',
        parentName: c.parentName ?? '',
        parentPhone: c.parentPhone ?? '',
      });
    }
    return workbookToBuffer(workbook);
  }

  async paymentsExcel(period: string): Promise<Buffer> {
    const table = await this.paymentsService.paymentsTable(period);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Оплаты ${period}`);
    sheet.columns = [
      { header: 'ФИО', key: 'fullName', width: 28 },
      { header: 'Группа', key: 'groupName', width: 16 },
      { header: 'Начислено', key: 'expected', width: 14 },
      { header: 'Оплачено', key: 'paid', width: 14 },
      { header: 'Остаток', key: 'remaining', width: 14 },
      { header: 'Статус', key: 'status', width: 18 },
    ];
    for (const r of table) {
      sheet.addRow({
        fullName: r.fullName,
        groupName: r.groupName ?? '',
        expected: r.expected,
        paid: r.paid,
        remaining: r.remaining,
        status: paymentStatusLabel(r.paymentStatus),
      });
    }
    return workbookToBuffer(workbook);
  }

  async debtorsExcel(period: string): Promise<Buffer> {
    const debtors = await this.paymentsService.debtors(period);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Не оплатили ${period}`);
    sheet.columns = [
      { header: 'ФИО', key: 'fullName', width: 28 },
      { header: 'Группа', key: 'groupName', width: 16 },
      { header: 'Начислено', key: 'expected', width: 14 },
      { header: 'Оплачено', key: 'paid', width: 14 },
      { header: 'Долг', key: 'remaining', width: 14 },
    ];
    for (const r of debtors) {
      sheet.addRow({ fullName: r.fullName, groupName: r.groupName ?? '', expected: r.expected, paid: r.paid, remaining: r.remaining });
    }
    return workbookToBuffer(workbook);
  }

  async expensesExcel(from?: string, to?: string): Promise<Buffer> {
    const expenses = await this.expensesService.findAll({ from, to });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Расходы');
    sheet.columns = [
      { header: 'Дата', key: 'date', width: 14 },
      { header: 'Категория', key: 'category', width: 20 },
      { header: 'Сумма', key: 'amount', width: 14 },
      { header: 'Описание', key: 'description', width: 30 },
      { header: 'Способ оплаты', key: 'paymentMethod', width: 16 },
    ];
    for (const e of expenses) {
      sheet.addRow({
        date: e.date,
        category: e.category,
        amount: Number(e.amount),
        description: e.description ?? '',
        paymentMethod: e.paymentMethod ?? '',
      });
    }
    return workbookToBuffer(workbook);
  }

  async bankOperationsExcel(): Promise<Buffer> {
    const operations = await this.paymentsService.bankOperations();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Банковские операции');
    sheet.columns = [
      { header: 'Дата', key: 'date', width: 14 },
      { header: 'Сумма', key: 'amount', width: 14 },
      { header: 'Плательщик', key: 'payerName', width: 26 },
      { header: 'Назначение', key: 'purpose', width: 30 },
      { header: 'Статус', key: 'status', width: 18 },
      { header: 'Ребёнок', key: 'childName', width: 24 },
    ];
    for (const op of operations) {
      sheet.addRow({
        date: op.date,
        amount: Number(op.amount),
        payerName: op.payerName,
        purpose: op.purpose ?? '',
        status: op.match ? matchStatusLabel(op.match.status) : 'Не обработано',
        childName: op.match?.childName ?? '',
      });
    }
    return workbookToBuffer(workbook);
  }

  // ТЗ раздел 20: один сводный PDF-отчёт (не полная выгрузка).
  async summaryPdf(period: string): Promise<Buffer> {
    const summary = await this.dashboardService.summary(period);
    const debtors = await this.paymentsService.debtors(period);

    return new Promise<Buffer>((resolve, reject) => {
      // pdfkit's built-in fonts have no Cyrillic glyphs, so a bundled
      // DejaVu Sans (shipped under mvp/assets/fonts) is registered
      // explicitly - same approach as kms/src/periods/transcript.util.ts.
      const fontDir = join(process.cwd(), 'assets', 'fonts');
      const doc = new PDFDocument({ margin: 50 });
      doc.registerFont('base', join(fontDir, 'DejaVuSans.ttf'));
      doc.registerFont('base-bold', join(fontDir, 'DejaVuSans-Bold.ttf'));

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('base-bold').fontSize(18).text('Асыл Аманат — финансовый отчёт', { align: 'center' });
      doc.font('base').fontSize(12).text(`Период: ${period}`, { align: 'center' });
      doc.moveDown(2);

      const rows: Array<[string, string]> = [
        ['Количество детей', String(summary.childrenCount)],
        ['План поступлений', formatSom(summary.plan)],
        ['Получено', formatSom(summary.received)],
        ['Задолженность', formatSom(summary.unpaid)],
        ['Расходы', formatSom(summary.expenses)],
        ['Остаток', formatSom(summary.balance)],
        ['% собираемости', `${summary.collectionRate}%`],
        ['Должников', String(summary.debtorsCount)],
        ['Средний платёж', formatSom(summary.averagePayment)],
      ];
      doc.font('base').fontSize(12);
      for (const [label, value] of rows) {
        doc.text(`${label}: ${value}`);
      }

      doc.moveDown(1.5);
      doc.font('base-bold').fontSize(14).text('Список должников', { underline: true });
      doc.moveDown(0.5);
      doc.font('base').fontSize(11);
      if (debtors.length === 0) {
        doc.text('Нет должников за этот период.');
      } else {
        for (const d of debtors) {
          doc.text(`${d.fullName} (${d.groupName ?? '—'}) — долг ${formatSom(d.remaining)}`);
        }
      }

      doc.end();
    });
  }
}

function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

function formatSom(n: number): string {
  return `${n.toLocaleString('ru-RU')} сом`;
}

function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Оплачено';
    case 'partial':
      return 'Частично оплачено';
    case 'overpaid':
      return 'Переплата';
    default:
      return 'Не оплачено';
  }
}

function matchStatusLabel(status: string): string {
  switch (status) {
    case 'auto_confirmed':
      return 'Автоматически подтверждено';
    case 'confirmed':
      return 'Подтверждено вручную';
    case 'needs_review':
      return 'Требует проверки';
    case 'not_a_payment':
      return 'Не является оплатой';
    default:
      return status;
  }
}
