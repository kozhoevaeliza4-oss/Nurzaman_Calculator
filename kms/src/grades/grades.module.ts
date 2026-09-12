import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grade } from './grade.entity';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { AuditModule } from '../audit/audit.module';
import { ParentsModule } from '../parents/parents.module';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [TypeOrmModule.forFeature([Grade]), AuditModule, ParentsModule, SubjectsModule],
  providers: [GradesService],
  controllers: [GradesController],
  exports: [GradesService],
})
export class GradesModule {}
