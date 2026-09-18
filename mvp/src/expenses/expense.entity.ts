import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// ТЗ раздел 12: фиксированный список категорий - "не сложную бухгалтерию".
export enum ExpenseCategory {
  SALARY = 'зарплата',
  GROCERIES = 'продукты',
  RENT = 'аренда',
  UTILITIES = 'коммунальные услуги',
  HOUSEHOLD = 'хозяйственные расходы',
  STATIONERY = 'канцтовары',
  REPAIR = 'ремонт',
  TRAINING = 'обучение',
  TAXES = 'налоги',
  OTHER = 'прочее',
}

@Entity('expenses')
export class Expense extends BaseEntity {
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;
}
