import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './parent.entity';
import { ChildParent } from './child-parent.entity';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Parent, ChildParent]), AuditModule],
  providers: [ParentsService],
  controllers: [ParentsController],
  exports: [ParentsService],
})
export class ParentsModule {}
