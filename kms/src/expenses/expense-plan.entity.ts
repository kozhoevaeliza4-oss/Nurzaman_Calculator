import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// One planned amount per category per month ("YYYY-MM").
@Entity('expense_plans')
@Index(['categoryId', 'period'], { unique: true })
export class ExpensePlan extends BaseEntity {
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column()
  period: string;

  @Column({ name: 'planned_amount', type: 'numeric', precision: 12, scale: 2 })
  plannedAmount: string;
}
