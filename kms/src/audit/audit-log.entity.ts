import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Module 14: "все действия пользователей фиксируются в журнале действий".
@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'user_email', type: 'varchar', nullable: true })
  userEmail: string | null;

  // e.g. "create", "update", "delete"
  @Column()
  action: string;

  // e.g. "child", "parent", "group"
  @Index()
  @Column({ name: 'entity_type' })
  entityType: string;

  @Index()
  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
