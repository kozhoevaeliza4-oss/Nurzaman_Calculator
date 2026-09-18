import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankTransaction } from '../transactions/bank-transaction.entity';
import { PaymentMatch } from './payment-match.entity';
import { Child } from '../children/child.entity';
import { ImportBatch } from '../imports/import-batch.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BankTransaction, PaymentMatch, Child, ImportBatch])],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
