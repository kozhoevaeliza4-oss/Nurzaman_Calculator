import { Injectable } from '@nestjs/common';
import { OpenAiClient } from '../ai/openai.client';
import { PaymentsService } from '../finance/payments.service';
import { BalancesService } from '../finance/balances.service';

// Module 12: "Прогноз поступлений на основе истории оплат. Анализ
// просрочек и должников, выявление паттернов. Рекомендации руководителю."
// Same privacy mitigation as Module 7: only aggregate numbers go to
// OpenAI — no child or parent names, no per-child amounts.
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly openAiClient: OpenAiClient,
    private readonly paymentsService: PaymentsService,
    private readonly balancesService: BalancesService,
  ) {}

  async forecast(months: number) {
    const [monthlyTotals, debtors] = await Promise.all([
      this.paymentsService.monthlyTotals(months),
      this.balancesService.listDebtors(),
    ]);

    const debtSummary = {
      debtorCount: debtors.length,
      totalDebt: debtors.reduce((sum, d) => sum + Number(d.debt), 0).toFixed(2),
    };

    if (!this.openAiClient.isConfigured()) {
      return {
        monthlyTotals,
        debtSummary,
        analysis:
          'AI-аналитика временно недоступна (не настроен OPENAI_API_KEY). Показаны только исходные цифры.',
      };
    }

    const stats = JSON.stringify({ monthlyTotals, debtSummary }, null, 2);
    const analysis = await this.openAiClient.chatCompletion([
      {
        role: 'system',
        content:
          'Ты — финансовый аналитик детского сада «Асыл-Аманат». На основе агрегированных ' +
          'данных ниже (без персональных данных) дай: 1) краткий прогноз поступлений на ' +
          'следующий месяц, 2) 2-3 наблюдаемых паттерна по просрочкам/должникам, ' +
          '3) 2-3 конкретные рекомендации руководителю. Отвечай кратко и по-русски.\n\n' +
          `Данные:\n${stats}`,
      },
      { role: 'user', content: 'Дай прогноз и рекомендации.' },
    ]);

    return {
      monthlyTotals,
      debtSummary,
      analysis: analysis ?? 'Не удалось получить анализ от AI. Показаны только исходные цифры.',
    };
  }
}
