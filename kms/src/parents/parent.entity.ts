import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('parents')
export class Parent extends BaseEntity {
  @Column({ name: 'full_name' })
  fullName: string;

  @Index()
  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  email: string | null;

  // Links this parent record to a login account (users table, role=parent).
  // Nullable until the parent is invited/activated.
  @Index({ unique: true, where: '"user_id" IS NOT NULL' })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;
}
