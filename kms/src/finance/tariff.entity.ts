import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 3: "Начисления: тариф по группе/ребёнку".
// Open question (TZ section 8, still unresolved): whether tariffs should
// instead be computed from actual attendance. Until that's decided, this
// only supports a fixed monthly amount per group, optionally overridden
// per child.
@Entity('tariffs')
export class Tariff extends BaseEntity {
  @Index()
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  // When set, overrides the group tariff for this specific child.
  @Index()
  @Column({ name: 'child_id', type: 'uuid', nullable: true })
  childId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;
}
