import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Payment } from './payment.entity';

// Module 3: "Формирование приходных документов и чеков по каждой оплате."
// One receipt per payment, with a human-readable sequential number.
@Entity('receipts')
export class Receipt extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'receipt_number', type: 'bigint' })
  receiptNumber: string;

  @Index({ unique: true })
  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @OneToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;
}
