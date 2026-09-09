import { Injectable, Logger } from '@nestjs/common';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

// Thin OpenAI Chat Completions wrapper shared by Module 7 (AI assistant)
// and Module 12 (AI analytics). Both TZ risk notes (modules 7 & 12) say
// to check the provider doesn't retain/train on this data and to
// de-identify requests — that's enforced by the *callers* building
// de-identified prompts, not by this client; see AssistantService and
// AiAnalyticsService for how the context is scrubbed before it gets here.
@Injectable()
export class OpenAiClient {
  private readonly logger = new Logger(OpenAiClient.name);

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async chatCompletion(messages: ChatMessage[]): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not configured — AI features are disabled');
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI API returned ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      this.logger.warn(`OpenAI API call failed: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
