import { ForbiddenException, Injectable } from '@nestjs/common';
import { OpenAiClient } from '../ai/openai.client';
import { ParentsService } from '../parents/parents.service';
import { BalancesService } from '../finance/balances.service';
import { AttendanceService } from '../attendance/attendance.service';
import { MenuService } from '../menu/menu.service';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Module 7: "Чат-помощник для родителей: ответы на вопросы об оплате,
// документах, расписании." Privacy mitigation from the TZ's risk note:
// the child's real name never reaches OpenAI — only an internal label
// ("Ребёнок 1") the parent can map back themselves from the reply.
@Injectable()
export class AssistantService {
  constructor(
    private readonly openAiClient: OpenAiClient,
    private readonly parentsService: ParentsService,
    private readonly balancesService: BalancesService,
    private readonly attendanceService: AttendanceService,
    private readonly menuService: MenuService,
  ) {}

  async chat(userId: string, message: string): Promise<{ reply: string }> {
    const parent = await this.parentsService.findByUserId(userId);
    if (!parent) throw new ForbiddenException('No parent record linked to this account');

    if (!this.openAiClient.isConfigured()) {
      return {
        reply:
          'AI-помощник временно недоступен (не настроен OPENAI_API_KEY). Обратитесь к администратору сада напрямую.',
      };
    }

    const links = await this.parentsService.childrenForParent(parent.id);
    const date = today();
    const [menuToday, childContexts] = await Promise.all([
      this.menuService.findForRange(date, date),
      Promise.all(
        links.map(async (link, index) => {
          const [balance, attendance] = await Promise.all([
            this.balancesService.getBalance(link.childId),
            this.attendanceService.findForChild(link.childId),
          ]);
          const lastEvent = attendance[0];
          return {
            label: `Ребёнок ${index + 1}`,
            balance,
            lastAttendanceEvent: lastEvent
              ? { type: lastEvent.eventType, at: lastEvent.occurredAt }
              : null,
          };
        }),
      ),
    ]);

    const context = JSON.stringify({ children: childContexts, menuToday }, null, 2);

    const reply = await this.openAiClient.chatCompletion([
      {
        role: 'system',
        content:
          'Ты — AI-помощник детского сада «Асыл-Аманат». Отвечай кратко и по-русски, ' +
          'только на основе предоставленных данных ниже. Не выдумывай факты. Если ответа ' +
          'нет в данных, скажи, что нужно обратиться к администратору.\n\nДанные:\n' +
          context,
      },
      { role: 'user', content: message },
    ]);

    return {
      reply: reply ?? 'Не удалось получить ответ от AI-помощника. Попробуйте позже.',
    };
  }
}
