import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Role } from '../common/roles.enum';
import { Direction } from '../common/direction.enum';

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

  // ТЗ v3.0 раздел 2: null = доступ к обоим направлениям (директор,
  // бухгалтер, медработник). Для admin - ограничение по назначению.
  // Для teacher/deputy_head/homeroom_teacher/subject_teacher значение
  // всегда выводится из роли (см. FIXED_DIRECTION_ROLES), это поле для
  // них не используется.
  @Column({ type: 'enum', enum: Direction, nullable: true })
  direction: Direction | null;
}
