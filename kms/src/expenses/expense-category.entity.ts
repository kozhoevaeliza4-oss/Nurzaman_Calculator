import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Direction } from '../common/direction.enum';

// Module 11: "статьи (зарплата, питание, коммунальные и т.п.)." ТЗ v3.0
// раздел 3: "Раздельно по направлениям" - null direction means a shared
// cost (e.g. общий административный персонал, аренда всего здания) that
// counts toward both Кидс and Школа totals.
@Entity('expense_categories')
export class ExpenseCategory extends BaseEntity {
  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ type: 'enum', enum: Direction, nullable: true })
  direction: Direction | null;
}
