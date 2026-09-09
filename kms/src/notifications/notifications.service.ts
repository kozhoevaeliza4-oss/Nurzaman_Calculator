import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus } from './notification.entity';
import { Parent } from '../parents/parent.entity';
import { ParentsService } from '../parents/parents.service';
import { TelegramAdapter } from './channels/telegram.adapter';
import { EmailAdapter } from './channels/email.adapter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    private readonly parentsService: ParentsService,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly emailAdapter: EmailAdapter,
  ) {}

  // Module 9 scenarios: "ребёнок пришёл/ушёл" (module 5), "начисление/
  // оплата" (module 3), "новости сада". Every notification always gets an
  // in-app (push) log entry — that's the one channel that needs no
  // external account — plus Telegram/Email when the parent has those
  // contacts on file. Best-effort: a failed external channel doesn't
  // throw, it's just logged with status=failed.
  async notifyParent(parent: Parent, message: string, scenario: string): Promise<void> {
    await this.log(parent.id, NotificationChannel.PUSH, NotificationStatus.SENT, message, scenario);

    if (parent.telegramChatId) {
      const result = await this.telegramAdapter.send(parent.telegramChatId, message);
      await this.logResult(parent.id, NotificationChannel.TELEGRAM, message, scenario, result);
    }

    if (parent.email) {
      const result = await this.emailAdapter.send(parent.email, message);
      await this.logResult(parent.id, NotificationChannel.EMAIL, message, scenario, result);
    }
  }

  async notifyParentsOfChild(childId: string, message: string, scenario: string): Promise<void> {
    const parents = await this.parentsService.parentsForChild(childId);
    await Promise.all(parents.map((parent) => this.notifyParent(parent, message, scenario)));
  }

  async broadcastNews(message: string): Promise<number> {
    const parents = await this.parentsService.findAll();
    await Promise.all(parents.map((parent) => this.notifyParent(parent, message, 'news')));
    return parents.length;
  }

  inboxForParent(parentId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { parentId, channel: NotificationChannel.PUSH },
      order: { createdAt: 'DESC' },
    });
  }

  private async logResult(
    parentId: string,
    channel: NotificationChannel,
    message: string,
    scenario: string,
    result: { ok: boolean; error?: string },
  ): Promise<void> {
    const status = result.ok
      ? NotificationStatus.SENT
      : result.error?.includes('not configured')
        ? NotificationStatus.NOT_CONFIGURED
        : NotificationStatus.FAILED;
    if (!result.ok) this.logger.warn(`${channel} notification failed: ${result.error}`);
    await this.log(parentId, channel, status, message, scenario, result.error);
  }

  private log(
    parentId: string,
    channel: NotificationChannel,
    status: NotificationStatus,
    message: string,
    scenario: string,
    error?: string,
  ): Promise<Notification> {
    return this.repo.save(
      this.repo.create({ parentId, channel, status, message, scenario, error: error ?? null }),
    );
  }
}
