import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Child, ChildStatus } from './child.entity';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { ChildImportRowDto } from './dto/import-children.dto';
import { ImportBatch, ImportBatchType } from '../imports/import-batch.entity';
import { ParsedTable } from '../imports/file-parser.util';
import { mapChildrenHeaders } from '../imports/column-mapper.util';
import { parseAmount, parseDate } from '../common/parse-helpers.util';
import { normalizeName } from '../common/name-match.util';
import { Paginated, paginate } from '../common/pagination.dto';

export interface ChildImportPreviewRow extends ChildImportRowDto {
  rowIndex: number;
  warnings: string[];
}

@Injectable()
export class ChildrenService {
  constructor(
    @InjectRepository(Child) private readonly repo: Repository<Child>,
    @InjectRepository(ImportBatch) private readonly batchRepo: Repository<ImportBatch>,
  ) {}

  async findAllPaginated(
    query: { groupName?: string; status?: ChildStatus; search?: string },
    page: number,
    pageSize: number,
  ): Promise<Paginated<Child>> {
    const qb = this.repo.createQueryBuilder('c');
    if (query.groupName) qb.andWhere('c.groupName = :g', { g: query.groupName });
    if (query.status) qb.andWhere('c.status = :s', { s: query.status });
    if (query.search) qb.andWhere('c.fullName ILIKE :search', { search: `%${query.search}%` });
    const [items, total] = await qb
      .orderBy('c.fullName', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginate(items, total, page, pageSize);
  }

  findAll(): Promise<Child[]> {
    return this.repo.find({ order: { fullName: 'ASC' } });
  }

  async findOne(id: string): Promise<Child> {
    const child = await this.repo.findOne({ where: { id } });
    if (!child) throw new NotFoundException('Ребёнок не найден');
    return child;
  }

  async create(dto: CreateChildDto): Promise<Child> {
    const duplicate = await this.findDuplicate(dto.fullName, dto.groupName ?? null);
    if (duplicate) throw new ConflictException('Такой ребёнок уже есть в списке (совпадает ФИО и группа)');
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateChildDto): Promise<Child> {
    const child = await this.findOne(id);
    Object.assign(child, dto);
    return this.repo.save(child);
  }

  async remove(id: string): Promise<void> {
    const child = await this.findOne(id);
    await this.repo.remove(child);
  }

  private async findDuplicate(fullName: string, groupName: string | null): Promise<Child | null> {
    const normalized = normalizeName(fullName);
    const candidates = await this.repo.find({ where: groupName ? { groupName } : {} });
    return candidates.find((c) => normalizeName(c.fullName) === normalized) ?? null;
  }

  // ---- Import: preview (no DB writes) ------------------------------------

  buildPreview(table: ParsedTable): { rows: ChildImportPreviewRow[]; unmappedColumns: string[] } {
    const fieldByColumn = mapChildrenHeaders(table.headers);
    const unmappedColumns = table.headers.filter((_, i) => !fieldByColumn[i]);

    const rows: ChildImportPreviewRow[] = table.rows.map((rawRow, i) => {
      const row: Record<string, string> = {};
      rawRow.forEach((value, colIndex) => {
        const field = fieldByColumn[colIndex];
        if (field) row[field] = value;
      });

      const warnings: string[] = [];
      if (!row.fullName || !row.fullName.trim()) warnings.push('Не найдено ФИО');
      const amount = parseAmount(row.monthlyFee);
      if (amount === null) warnings.push('Не удалось распознать сумму оплаты');
      if (!row.groupName) warnings.push('Группа не определена');

      return {
        rowIndex: i,
        fullName: row.fullName ?? '',
        groupName: row.groupName ?? '',
        monthlyFee: row.monthlyFee ?? '',
        status: row.status ?? '',
        startDate: row.startDate ?? '',
        parentName: row.parentName ?? '',
        parentPhone: row.parentPhone ?? '',
        warnings,
      };
    });

    // Duplicate detection within the file itself.
    const seen = new Map<string, number>();
    for (const row of rows) {
      const key = normalizeName(row.fullName || '');
      if (!key) continue;
      if (seen.has(key)) {
        row.warnings.push('Дублируется в файле');
        rows[seen.get(key)!].warnings.push('Дублируется в файле');
      } else {
        seen.set(key, row.rowIndex);
      }
    }

    return { rows, unmappedColumns };
  }

  // ---- Import: commit (validated rows -> DB) -----------------------------

  async commitImport(
    fileName: string,
    rows: ChildImportRowDto[],
    uploadedBy: string | null,
  ): Promise<{ batchId: string; imported: number; skipped: Array<{ row: ChildImportRowDto; reason: string }> }> {
    const skipped: Array<{ row: ChildImportRowDto; reason: string }> = [];
    let imported = 0;

    for (const row of rows) {
      if (!row.fullName || !row.fullName.trim()) {
        skipped.push({ row, reason: 'Нет ФИО' });
        continue;
      }
      const amount = parseAmount(row.monthlyFee);
      if (amount === null) {
        skipped.push({ row, reason: 'Не удалось распознать сумму оплаты' });
        continue;
      }
      const duplicate = await this.findDuplicate(row.fullName, row.groupName?.trim() || null);
      if (duplicate) {
        skipped.push({ row, reason: 'Уже есть в списке (дубликат)' });
        continue;
      }

      const status =
        row.status && /неактив|выбыл|inactive/i.test(row.status) ? ChildStatus.INACTIVE : ChildStatus.ACTIVE;

      await this.repo.save(
        this.repo.create({
          fullName: row.fullName.trim(),
          groupName: row.groupName?.trim() || null,
          monthlyFee: amount.toFixed(2),
          status,
          startDate: parseDate(row.startDate),
          parentName: row.parentName?.trim() || null,
          parentPhone: row.parentPhone?.trim() || null,
        }),
      );
      imported++;
    }

    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        type: ImportBatchType.CHILDREN,
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
}
