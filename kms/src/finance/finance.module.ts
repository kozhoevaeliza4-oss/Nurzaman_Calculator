import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './tariff.entity';
import { Charge } from './charge.entity';
import { Payment } from './payment.entity';
import { Receipt } from './receipt.entity';
import { TariffsService } from './tariffs.service';
import { ChargesService } from './charges.service';
import { PaymentsService } from './payments.service';
import { BalancesService } from './balances.service';
import { TariffsController } from './tariffs.controller';
import { FinanceController } from './finance.controller';
import { AuditModule } from '../audit/audit.module';
import { ChildrenModule } from '../children/children.module';
import { ParentsModule } from '../parents/parents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tariff, Charge, Payment, Receipt]),
    AuditModule,
    ChildrenModule,
    ParentsModule,
  ],
  providers: [TariffsService, ChargesService, PaymentsService, BalancesService],
  controllers: [TariffsController, FinanceController],
  exports: [TariffsService, ChargesService, PaymentsService, BalancesService],
})
export class FinanceModule {}
