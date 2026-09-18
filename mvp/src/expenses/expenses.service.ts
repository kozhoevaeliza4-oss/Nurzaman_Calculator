import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense, ExpenseCategory } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseImportRowDto } from './dto/import-expenses.dto';
import { ImportBatch, ImportBatchType } from '../imports/import-batch.entity';
import { ParsedTable } from '../imports/file-parser.util';
import { mapExpenseHeaders } from '../imports/column-mapper.util';
import { parseAmount, parseDate } from '../common/parse-helpers.util';

export interface ExpenseImportPreviewRow extends ExpenseImportRowDto {
  rowIndex: number;
  warnings: string[];
}

const CATEGORY_VALUES = Object.values(ExpenseCategory) as string[];

function matchCategory(raw: string | undefined): ExpenseCategory | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  const found = CATEGORY_VALUES.find((c) => c.toLowerCase() === normalized);
  return (found as ExpenseCategory) ?? null;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly repo: Repository<Expense>,
    @InjectRepository(ImportBatch) private readonly batchRepo: Repository<ImportBatch>,
  ) {}

  findAll(query: { category?: ExpenseCategory; from?: string; to?: string }): Promise<Expense[]> {
    const qb = this.repo.createQueryBuilder('e');
    if (query.category) qb.andWhere('e.category = :c', { c: query.category });
    if (query.from) qb.andWhere('e.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('e.date <= :to', { to: query.to });
    return qb.orderBy('e.date', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.repo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Расход не найден');
    return expense;
  }

  create(dto: CreateExpenseDto): Promise<Expense> {
    return this.repo.save(
      this.repo.create({
        date: dto.date,
        category: dto.category,
        amount: dto.amount,
        description: dto.description ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        comment: dto.comment ?? null,
      }),
    );
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id);
    Object.assign(expense, dto);
    return this.repo.save(expense);
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);
    await this.repo.remove(expense);
  }

  listCategories(): ExpenseCategory[] {
    return Object.values(ExpenseCategory);
  }

  // ---- Import: preview (no DB writes) ------------------------------------

  buildPreview(table: ParsedTable): { rows: ExpenseImportPreviewRow[]; unmappedColumns: string[] } {
    const fieldByColumn = mapExpenseHeaders(table.headers);
    const unmappedColumns = table.headers.filter((_, i) => !fieldByColumn[i]);

    const rows: ExpenseImportPreviewRow[] = table.rows.map((rawRow, i) => {
      const row: Record<string, string> = {};
      rawRow.forEach((value, colIndex) => {
        const field = fieldByColumn[colIndex];
        if (field) row[field] = value;
      });

      const warnings: string[] = [];
      if (!parseDate(row.date)) warnings.push('Не удалось распознать дату');
      if (parseAmount(row.amount) === null) warnings.push('Не удалось распознать сумму');
      if (!matchCategory(row.category)) warnings.push('Категория не распознана — выберите вручную');

      return {
        rowIndex: i,
        date: row.date ?? '',
        category: row.category ?? '',
        amount: row.amount ?? '',
        description: row.description ?? '',
        paymentMethod: row.paymentMethod ?? '',
        warnings,
      };
    });

    return { rows, unmappedColumns };
  }

  // ---- Import: commit (validated rows -> DB) -----------------------------

  async commitImport(
    fileName: string,
    rows: ExpenseImportRowDto[],
    uploadedBy: string | null,
  ): Promise<{ batchId: string; imported: number; skipped: Array<{ row: ExpenseImportRowDto; reason: string }> }> {
    const skipped: Array<{ row: ExpenseImportRowDto; reason: string }> = [];
    let imported = 0;

    for (const row of rows) {
      const date = parseDate(row.date);
      const amount = parseAmount(row.amount);
      const category = matchCategory(row.category);
      if (!date) {
        skipped.push({ row, reason: 'Не удалось распознать дату' });
        continue;
      }
      if (amount === null) {
        skipped.push({ row, reason: 'Не удалось распознать сумму' });
        continue;
      }
      if (!category) {
        skipped.push({ row, reason: 'Категория не распознана' });
        continue;
      }

      await this.repo.save(
        this.repo.create({
          date,
          category,
          amount: amount.toFixed(2),
          description: row.description?.trim() || null,
          paymentMethod: row.paymentMethod?.trim() || null,
          comment: null,
        }),
      );
      imported++;
    }

    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        type: ImportBatchType.EXPENSES,
        fileName,
        totalRows: rows.length,
        matchedRows: imported,
        needsReviewRows: 0,
        skippedDuplicateRows: skipped.length,
        uploadedBy,
      }),
    );

    return { batchId: batch.id, imported, skipped };
  }

  async totalForPeriod(from?: string, to?: string): Promise<number> {
    const qb = this.repo.createQueryBuilder('e').select('COALESCE(SUM(e.amount), 0)', 'total');
    if (from) qb.andWhere('e.date >= :from', { from });
    if (to) qb.andWhere('e.date <= :to', { to });
    const result = await qb.getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }
}
