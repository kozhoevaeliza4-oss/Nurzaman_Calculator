import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum ImportBatchType {
  CHILDREN = 'children',
  BANK_STATEMENT = 'bank_statement',
  EXPENSES = 'expenses',
}

// ТЗ раздел 18: "История загрузок" - what file, when, how many rows, how
// many auto-matched, how many need review.
@Entity('import_batches')
export class ImportBatch extends BaseEntity {
  @Column({ type: 'enum', enum: ImportBatchType })
  type: ImportBatchType;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'total_rows', type: 'int' })
  totalRows: number;

  @Column({ name: 'matched_rows', type: 'int', default: 0 })
  matchedRows: number;

  @Column({ name: 'needs_review_rows', type: 'int', default: 0 })
  needsReviewRows: number;

  @Column({ name: 'skipped_duplicate_rows', type: 'int', default: 0 })
  skippedDuplicateRows: number;

  @Column({ name: 'uploaded_by', type: 'varchar', nullable: true })
  uploadedBy: string | null;
}
