import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 9: "Каналы: Telegram, Email, Push (в приложении), WhatsApp."
export enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatus {
  SENT = 'sent',
  FAILED = 'failed',
  NOT_CONFIGURED = 'not_configured',
}

@Entity('notifications')
export class Notification extends BaseEntity {
  @Index()
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationStatus })
  status: NotificationStatus;

  @Column()
  message: string;

  // e.g. "attendance", "payment", "news"
  @Column()
  scenario: string;

  @Column({ nullable: true })
  error: string | null;
}
