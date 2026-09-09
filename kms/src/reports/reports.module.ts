import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { FinanceModule } from '../finance/finance.module';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [AttendanceModule, FinanceModule, ChildrenModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
