import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Child } from './child.entity';
import { ImportBatch } from '../imports/import-batch.entity';
import { ChildrenService } from './children.service';
import { ChildrenController } from './children.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Child, ImportBatch])],
  providers: [ChildrenService],
  controllers: [ChildrenController],
  exports: [ChildrenService, TypeOrmModule],
})
export class ChildrenModule {}
