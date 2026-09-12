import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './subject.entity';
import { ClassSubject } from './class-subject.entity';
import { TeacherSubjectAssignment } from './teacher-subject-assignment.entity';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, ClassSubject, TeacherSubjectAssignment]),
    AuditModule,
  ],
  providers: [SubjectsService],
  controllers: [SubjectsController],
  exports: [SubjectsService],
})
export class SubjectsModule {}
