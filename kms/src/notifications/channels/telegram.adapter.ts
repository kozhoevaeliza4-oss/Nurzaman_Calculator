import { Injectable } from '@nestjs/common';
import { ChannelAdapter, ChannelSendResult } from './channel-adapter.interface';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  async send(chatId: string, message: string): Promise<ChannelSendResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
      if (!response.ok) {
        return { ok: false, error: `Telegram API returned ${response.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown Telegram error' };
    }
  }
}
