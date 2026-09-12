import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicPeriod } from './academic-period.entity';
import { PeriodGrade } from './period-grade.entity';
import { Exam } from './exam.entity';
import { ExamResult } from './exam-result.entity';
import { PeriodsService } from './periods.service';
import { PeriodsController } from './periods.controller';
import { AuditModule } from '../audit/audit.module';
import { ParentsModule } from '../parents/parents.module';
import { ChildrenModule } from '../children/children.module';
import { GroupsModule } from '../groups/groups.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { GradesModule } from '../grades/grades.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicPeriod, PeriodGrade, Exam, ExamResult]),
    AuditModule,
    ParentsModule,
    ChildrenModule,
    GroupsModule,
    SubjectsModule,
    GradesModule,
  ],
  providers: [PeriodsService],
  controllers: [PeriodsController],
})
export class PeriodsModule {}
