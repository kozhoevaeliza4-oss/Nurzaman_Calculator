import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { ParentsModule } from '../parents/parents.module';
import { FinanceModule } from '../finance/finance.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { MenuModule } from '../menu/menu.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ParentsModule, FinanceModule, AttendanceModule, MenuModule, NotificationsModule],
  controllers: [MeController],
})
export class MeModule {}
