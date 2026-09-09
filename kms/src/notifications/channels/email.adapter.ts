import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ChannelAdapter, ChannelSendResult } from './channel-adapter.interface';

@Injectable()
export class EmailAdapter implements ChannelAdapter {
  async send(email: string, message: string): Promise<ChannelSendResult> {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      return { ok: false, error: 'SMTP is not configured' };
    }

    try {
      const transport = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT ? Number(SMTP_PORT) : 587,
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      });
      await transport.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: email,
        subject: 'Асыл-Аманат',
        text: message,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown SMTP error' };
    }
  }
}
