import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { QueryMenuDto } from './dto/query-menu.dto';

// Everyone (including parents) can view the menu — it's not per-child data.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findForRange(@Query() query: QueryMenuDto) {
    return this.menuService.findForRange(query.from, query.to);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER, Role.MEDIC)
  @Get('warnings')
  getAllergyWarnings(@Query('date') date: string) {
    return this.menuService.allergyWarningsForDate(date);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.MEDIC)
  @Post()
  async create(@Body() dto: CreateMenuItemDto, @CurrentUser() user: AuthUser) {
    const item = await this.menuService.create(dto);
    await this.auditService.record(user, 'create', 'menu_item', item.id, dto);
    return item;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.MEDIC)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto, @CurrentUser() user: AuthUser) {
    const item = await this.menuService.update(id, dto);
    await this.auditService.record(user, 'update', 'menu_item', id, dto);
    return item;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.MEDIC)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.menuService.remove(id);
    await this.auditService.record(user, 'delete', 'menu_item', id);
    return { success: true };
  }
}
