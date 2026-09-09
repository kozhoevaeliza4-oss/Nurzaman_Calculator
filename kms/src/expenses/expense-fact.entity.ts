import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// An actual, recorded expense.
@Entity('expense_facts')
export class ExpenseFact extends BaseEntity {
  @Index()
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'spent_at', type: 'date' })
  spentAt: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;
}
