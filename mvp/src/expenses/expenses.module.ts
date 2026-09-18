import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { ImportBatch } from '../imports/import-batch.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ImportBatch])],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [ExpensesService, TypeOrmModule],
})
export class ExpensesModule {}
