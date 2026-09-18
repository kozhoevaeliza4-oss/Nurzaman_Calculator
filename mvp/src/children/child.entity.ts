import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum ChildStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// ТЗ раздел 2, блок "Дети" - deliberately flat (no separate Group entity,
// no direction, no roles): группа is just a text field here.
@Entity('children')
export class Child extends BaseEntity {
  @Index()
  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'group_name', type: 'varchar', nullable: true })
  groupName: string | null;

  @Column({ name: 'monthly_fee', type: 'numeric', precision: 12, scale: 2 })
  monthlyFee: string;

  @Column({ type: 'enum', enum: ChildStatus, default: ChildStatus.ACTIVE })
  status: ChildStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  // Parent phone/name - not a real Parent entity (out of scope for this
  // stage), just extra text the matching algorithm can use as a signal.
  @Column({ name: 'parent_name', type: 'varchar', nullable: true })
  parentName: string | null;

  @Column({ name: 'parent_phone', type: 'varchar', nullable: true })
  parentPhone: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
