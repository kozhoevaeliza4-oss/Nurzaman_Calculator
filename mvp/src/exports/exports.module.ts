import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Child } from '../children/child.entity';
import { PaymentsModule } from '../payments/payments.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Child]), PaymentsModule, ExpensesModule, DashboardModule],
  providers: [ExportsService],
  controllers: [ExportsController],
})
export class ExportsModule {}
