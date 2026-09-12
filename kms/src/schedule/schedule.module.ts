import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonSlot } from './lesson-slot.entity';
import { ScheduleChange } from './schedule-change.entity';
import { LessonAttendance } from './lesson-attendance.entity';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { AuditModule } from '../audit/audit.module';
import { ParentsModule } from '../parents/parents.module';
import { ChildrenModule } from '../children/children.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonSlot, ScheduleChange, LessonAttendance]),
    AuditModule,
    ParentsModule,
    ChildrenModule,
    NotificationsModule,
  ],
  providers: [ScheduleService],
  controllers: [ScheduleController],
  exports: [ScheduleService],
})
export class ScheduleModule {}
