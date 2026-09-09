import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum PaymentMethod {
  BANK_QR = 'bank_qr',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
}

// Module 3: "Приём оплат: банковский QR-код, наличные, банковский перевод."
@Entity('payments')
export class Payment extends BaseEntity {
  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ name: 'paid_at', type: 'date' })
  paidAt: string;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  // Staff member who recorded the payment (director/admin/accountant).
  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy: string | null;

  // Module 4 (1C sync): set once 1C confirms this payment reconciles
  // against its own accounting document.
  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
  reconciledAt: Date | null;

  @Column({ name: 'one_c_document_id', type: 'varchar', nullable: true })
  oneCDocumentId: string | null;
}
