import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../finance/payments.service';
import { BalancesService } from '../finance/balances.service';
import { ExpensesService } from '../expenses/expenses.service';
import { AttendanceService } from '../attendance/attendance.service';
import { GroupsService } from '../groups/groups.service';
import { ChildrenService } from '../children/children.service';
import { ChildStatus } from '../children/child.entity';

// Module 8: "Онлайн-сводка: поступления, задолженность, посещаемость,
// свободные места. Доходы / расходы / прибыль в реальном времени."
@Injectable()
export class DashboardService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly balancesService: BalancesService,
    private readonly expensesService: ExpensesService,
    private readonly attendanceService: AttendanceService,
    private readonly groupsService: GroupsService,
    private readonly childrenService: ChildrenService,
  ) {}

  async summary(from: string, to: string) {
    const [income, expenses, debtors, attendance, freeSpots] = await Promise.all([
      this.paymentsService.totalForRange(from, to),
      this.expensesService.totalActualForRange(from, to),
      this.balancesService.listDebtors(),
      this.attendanceService.todaySummary(),
      this.freeSpotsByGroup(),
    ]);

    const profit = (Number(income) - Number(expenses)).toFixed(2);
    const totalDebt = debtors.reduce((sum, d) => sum + Number(d.debt), 0).toFixed(2);

    return {
      period: { from, to },
      income,
      expenses,
      profit,
      debt: { total: totalDebt, debtorCount: debtors.length },
      attendance,
      freeSpots,
    };
  }

  private async freeSpotsByGroup() {
    const groups = await this.groupsService.findAll();
    return Promise.all(
      groups.map(async (group) => {
        const activeChildren = await this.childrenService.findAll({
          groupId: group.id,
          status: ChildStatus.ACTIVE,
        });
        return {
          groupId: group.id,
          groupName: group.name,
          capacity: group.capacity,
          occupied: activeChildren.length,
          freeSpots: Math.max(group.capacity - activeChildren.length, 0),
        };
      }),
    );
  }
}
