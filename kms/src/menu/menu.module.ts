import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem } from './menu-item.entity';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { AuditModule } from '../audit/audit.module';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem]), AuditModule, ChildrenModule],
  providers: [MenuService],
  controllers: [MenuController],
  exports: [MenuService],
})
export class MenuModule {}
