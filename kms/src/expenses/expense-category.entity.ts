import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 11: "статьи (зарплата, питание, коммунальные и т.п.)."
@Entity('expense_categories')
export class ExpenseCategory extends BaseEntity {
  @Index({ unique: true })
  @Column()
  name: string;
}
