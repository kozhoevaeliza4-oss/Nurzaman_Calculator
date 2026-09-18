import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum MatchStatus {
  AUTO_CONFIRMED = 'auto_confirmed',
  NEEDS_REVIEW = 'needs_review',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  NOT_A_PAYMENT = 'not_a_payment',
}

export enum ConfidenceTier {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
}

export enum PeriodSource {
  PURPOSE_TEXT = 'purpose_text',
  TRANSACTION_DATE = 'transaction_date',
  MANUAL = 'manual',
  UNKNOWN = 'unknown',
}

// ТЗ раздел 6-11, 17, 27: the outcome of matching one BankTransaction to a
// Child, with an explainable confidence score and a full audit trail of
// who confirmed it and when. One row per transaction (unique).
@Entity('payment_matches')
export class PaymentMatch extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @Column({ name: 'child_id', type: 'uuid', nullable: true })
  childId: string | null;

  @Column({ name: 'period_year_month', type: 'varchar', nullable: true })
  periodYearMonth: string | null;

  @Column({ name: 'period_source', type: 'enum', enum: PeriodSource, default: PeriodSource.UNKNOWN })
  periodSource: PeriodSource;

  @Column({ name: 'confidence_score', type: 'int', default: 0 })
  confidenceScore: number;

  @Column({ name: 'confidence_tier', type: 'enum', enum: ConfidenceTier, default: ConfidenceTier.RED })
  confidenceTier: ConfidenceTier;

  // e.g. [{ label: 'ФИО', score: 100 }, { label: 'Сумма', score: 100 }]
  // — shown to the admin so every auto-match is explainable (раздел 25).
  @Column({ name: 'confidence_reasons', type: 'jsonb', default: () => "'[]'" })
  confidenceReasons: Array<{ label: string; score: number }>;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.NEEDS_REVIEW })
  status: MatchStatus;

  @Column({ name: 'confirmed_by', type: 'varchar', nullable: true })
  confirmedBy: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;
}
