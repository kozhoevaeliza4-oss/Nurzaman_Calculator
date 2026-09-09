import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum ChargeType {
  MONTHLY_TARIFF = 'monthly_tariff',
  ONE_TIME = 'one_time',
  DISCOUNT = 'discount',
}

// Module 3: "Начисления: тариф по группе/ребёнку, разовые и ежемесячные
// начисления, скидки." A discount is recorded as a negative amount.
@Entity('charges')
export class Charge extends BaseEntity {
  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: ChargeType })
  type: ChargeType;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  // Debt is computed "as of the current date" against this date
  // (TZ Module 3: "автоматический расчёт задолженности на текущую дату").
  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;
}
