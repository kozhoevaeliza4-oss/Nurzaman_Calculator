import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// MVP ТЗ раздел 21: no role system - one admin/owner account is enough
// for this stage.
@Entity('admin_users')
export class AdminUser extends BaseEntity {
  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;
}
