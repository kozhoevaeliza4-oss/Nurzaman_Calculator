import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Homework } from './homework.entity';
import { HomeworkSubmission } from './homework-submission.entity';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { AuditModule } from '../audit/audit.module';
import { ParentsModule } from '../parents/parents.module';
import { ChildrenModule } from '../children/children.module';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Homework, HomeworkSubmission]),
    AuditModule,
    ParentsModule,
    ChildrenModule,
    SubjectsModule,
  ],
  providers: [HomeworkService],
  controllers: [HomeworkController],
})
export class HomeworkModule {}
