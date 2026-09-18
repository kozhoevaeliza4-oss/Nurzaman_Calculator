import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Child, ChildStatus } from '../children/child.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { PaymentsService } from '../payments/payments.service';

export interface DashboardSummary {
  childrenCount: number;
  plan: number;
  received: number;
  unpaid: number;
  expenses: number;
  balance: number;
  collectionRate: number;
  debtorsCount: number;
  averagePayment: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Child) private readonly childrenRepo: Repository<Child>,
    private readonly paymentsService: PaymentsService,
    private readonly expensesService: ExpensesService,
  ) {}

  // ТЗ раздел 15: план поступлений, получено, не оплачено, расходы,
  // остаток, % собираемости, должники, средний платёж.
  async summary(period: string): Promise<DashboardSummary> {
    const table = await this.paymentsService.paymentsTable(period);
    const activeChildren = table.length || (await this.childrenRepo.count({ where: { status: ChildStatus.ACTIVE } }));

    const plan = round2(table.reduce((sum, r) => sum + r.expected, 0));
    const received = round2(table.reduce((sum, r) => sum + r.paid, 0));
    const unpaid = round2(Math.max(plan - received, 0));
    const debtorsCount = table.filter((r) => r.paymentStatus === 'unpaid' || r.paymentStatus === 'partial').length;
    const payers = table.filter((r) => r.paid > 0);
    const averagePayment = payers.length ? round2(payers.reduce((sum, r) => sum + r.paid, 0) / payers.length) : 0;

    const [from, to] = monthRange(period);
    const expenses = round2(await this.expensesService.totalForPeriod(from, to));
    const balance = round2(received - expenses);
    const collectionRate = plan > 0 ? round2((received / plan) * 100) : 0;

    return {
      childrenCount: activeChildren,
      plan,
      received,
      unpaid,
      expenses,
      balance,
      collectionRate,
      debtorsCount,
      averagePayment,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthRange(period: string): [string, string] {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const from = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return [from, to];
}
