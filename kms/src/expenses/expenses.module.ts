import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseCategory } from './expense-category.entity';
import { ExpensePlan } from './expense-plan.entity';
import { ExpenseFact } from './expense-fact.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseCategory, ExpensePlan, ExpenseFact]), AuditModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [ExpensesService],
})
export class ExpensesModule {}
