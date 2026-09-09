import { Injectable } from '@nestjs/common';
import { ChannelAdapter, ChannelSendResult } from './channel-adapter.interface';

// Module 9's TZ risk note: "WhatsApp Web" automation is against Meta's
// terms and risks the number being banned — only the official WhatsApp
// Business API (a paid account) is acceptable. This adapter is wired up
// so the rest of the system doesn't change once that account exists;
// until WHATSAPP_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID are configured, it
// reports not-configured rather than attempting anything.
@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  async send(phoneNumber: string, message: string): Promise<ChannelSendResult> {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return { ok: false, error: 'WhatsApp Business API is not configured' };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: message },
        }),
      });
      if (!response.ok) {
        return { ok: false, error: `WhatsApp API returned ${response.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown WhatsApp error' };
    }
  }
}
