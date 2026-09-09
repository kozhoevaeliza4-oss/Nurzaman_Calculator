import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Role } from '../common/roles.enum';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ default: true })
  active: boolean;

  // For teachers: the group they are assigned to (module 1). Nullable —
  // only meaningful for the "teacher" role.
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;
}
