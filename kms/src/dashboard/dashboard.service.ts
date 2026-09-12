import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../finance/payments.service';
import { BalancesService } from '../finance/balances.service';
import { ExpensesService } from '../expenses/expenses.service';
import { AttendanceService } from '../attendance/attendance.service';
import { GroupsService } from '../groups/groups.service';
import { ChildrenService } from '../children/children.service';
import { ChildStatus } from '../children/child.entity';
import { Direction } from '../common/direction.enum';
import { QueryChildrenDto } from '../children/dto/query-children.dto';

// Module 8: "Онлайн-сводка: поступления, задолженность, посещаемость,
// свободные места. Доходы / расходы / прибыль в реальном времени."
// ТЗ v3.0 раздел 1.2: "в dashboard руководителя показывается и по
// отдельности, и суммарно" - a both-direction viewer (director/
// accountant/medic) gets `byDirection` alongside the combined totals; a
// single-direction viewer (admin pinned to one, or anyone else) just gets
// the flat totals scoped to their direction.
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

  async summary(from: string, to: string, allowed: Direction[] | null) {
    const direction = allowed && allowed.length === 1 ? allowed[0] : undefined;
    const base = await this.summaryFor(from, to, direction);

    if (allowed !== null) {
      return { period: { from, to }, ...base };
    }

    const [kids, school] = await Promise.all([
      this.summaryFor(from, to, Direction.KIDS),
      this.summaryFor(from, to, Direction.SCHOOL),
    ]);
    return {
      period: { from, to },
      ...base,
      byDirection: { kids, school },
    };
  }

  private async summaryFor(from: string, to: string, direction?: Direction) {
    const [income, expenses, debtors, attendance, freeSpots] = await Promise.all([
      this.paymentsService.totalForRange(from, to, direction),
      this.expensesService.totalActualForRange(from, to, direction),
      this.balancesService.listDebtors(direction),
      this.attendanceService.todaySummary(direction),
      this.freeSpotsByGroup(direction),
    ]);

    const profit = (Number(income) - Number(expenses)).toFixed(2);
    const totalDebt = debtors.reduce((sum, d) => sum + Number(d.debt), 0).toFixed(2);

    return {
      income,
      expenses,
      profit,
      debt: { total: totalDebt, debtorCount: debtors.length },
      attendance,
      freeSpots,
    };
  }

  private async freeSpotsByGroup(direction?: Direction) {
    const groups = await this.groupsService.findAll(direction ? [direction] : null);
    return Promise.all(
      groups.map(async (group) => {
        const activeChildren = await this.childrenService.findAll({
          groupId: group.id,
          status: ChildStatus.ACTIVE,
        } as QueryChildrenDto);
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
