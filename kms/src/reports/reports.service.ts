import { Injectable } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { PaymentsService } from '../finance/payments.service';
import { ChargesService } from '../finance/charges.service';
import { BalancesService } from '../finance/balances.service';
import { ChildrenService } from '../children/children.service';

// Module 10: "Формирование отчётов день/неделя/месяц: посещаемость,
// финансы, задолженность." The day/week/month distinction is just the
// caller picking a `from`/`to` range — the report shape doesn't change.
@Injectable()
export class ReportsService {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly paymentsService: PaymentsService,
    private readonly chargesService: ChargesService,
    private readonly balancesService: BalancesService,
    private readonly childrenService: ChildrenService,
  ) {}

  async attendanceReport(from: string, to: string): Promise<Array<Record<string, unknown>>> {
    const [records, children] = await Promise.all([
      this.attendanceService.findForRange(new Date(from), new Date(`${to}T23:59:59.999Z`)),
      this.childrenService.findAll({}),
    ]);
    const nameById = new Map(children.map((c) => [c.id, c.fullName]));

    return records.map((record) => ({
      date: record.occurredAt.toISOString(),
      childId: record.childId,
      childFullName: nameById.get(record.childId) ?? '',
      eventType: record.eventType,
    }));
  }

  async financeReport(from: string, to: string) {
    const [income, charged] = await Promise.all([
      this.paymentsService.totalForRange(from, to),
      this.chargesService.totalForRange(from, to),
    ]);
    return { period: { from, to }, income, charged };
  }

  debtReport() {
    return this.balancesService.listDebtors();
  }
}
