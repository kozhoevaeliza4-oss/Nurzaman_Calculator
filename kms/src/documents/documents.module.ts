import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildDocument } from './document.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { STORAGE_ADAPTER } from './storage/storage.interface';
import { LocalDiskStorage } from './storage/local-disk-storage';
import { AuditModule } from '../audit/audit.module';
import { ParentsModule } from '../parents/parents.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChildDocument]), AuditModule, ParentsModule],
  providers: [DocumentsService, { provide: STORAGE_ADAPTER, useClass: LocalDiskStorage }],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
