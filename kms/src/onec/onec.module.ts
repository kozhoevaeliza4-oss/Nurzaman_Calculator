import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncLog } from './sync-log.entity';
import { OneCService } from './onec.service';
import { OneCController } from './onec.controller';
import { AuditModule } from '../audit/audit.module';
import { FinanceModule } from '../finance/finance.module';
import { ParentsModule } from '../parents/parents.module';

@Module({
  imports: [TypeOrmModule.forFeature([SyncLog]), AuditModule, FinanceModule, ParentsModule],
  providers: [OneCService],
  controllers: [OneCController],
})
export class OneCModule {}
