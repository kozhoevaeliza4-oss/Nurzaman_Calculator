import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { FinanceModule } from '../finance/finance.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { GroupsModule } from '../groups/groups.module';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [FinanceModule, ExpensesModule, AttendanceModule, GroupsModule, ChildrenModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
