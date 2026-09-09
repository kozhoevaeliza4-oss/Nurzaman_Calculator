import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('parents')
export class Parent extends BaseEntity {
  @Column({ name: 'full_name' })
  fullName: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  // Links this parent record to a login account (users table, role=parent).
  // Nullable until the parent is invited/activated.
  @Index({ unique: true, where: '"user_id" IS NOT NULL' })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  // Module 9: Telegram chat id, captured once the parent starts the bot
  // (e.g. via a /start deep link carrying their parent id).
  @Column({ name: 'telegram_chat_id', type: 'varchar', nullable: true })
  telegramChatId: string | null;
}
