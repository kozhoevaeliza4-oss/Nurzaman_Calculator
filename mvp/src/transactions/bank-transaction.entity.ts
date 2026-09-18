import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// ТЗ раздел 5: one row per bank statement transaction, kept forever
// (раздел 27: "никогда не удалять исходные данные банковской выписки").
@Entity('bank_transactions')
export class BankTransaction extends BaseEntity {
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'payer_name' })
  payerName: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ name: 'transaction_ref', nullable: true })
  transactionRef: string | null;

  // Dedup key (раздел 19: не учитывать повторно ту же операцию при
  // повторной загрузке того же файла).
  @Index({ unique: true })
  @Column()
  fingerprint: string;

  @Column({ name: 'import_batch_id', type: 'uuid' })
  importBatchId: string;
}
