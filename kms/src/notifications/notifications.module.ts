import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramAdapter } from './channels/telegram.adapter';
import { EmailAdapter } from './channels/email.adapter';
import { WhatsAppAdapter } from './channels/whatsapp.adapter';
import { AuditModule } from '../audit/audit.module';
import { ParentsModule } from '../parents/parents.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), AuditModule, ParentsModule],
  providers: [NotificationsService, TelegramAdapter, EmailAdapter, WhatsAppAdapter],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
