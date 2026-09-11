import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly auditService: AuditService,
  ) {}

  // Groups carry capacity/teacher assignment info that isn't a parent's
  // business — only staff roles get to list or look one up.
  @Roles(Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT, Role.TEACHER, Role.MEDIC)
  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT, Role.TEACHER, Role.MEDIC)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateGroupDto, @CurrentUser() user: AuthUser) {
    const group = await this.groupsService.create(dto);
    await this.auditService.record(user, 'create', 'group', group.id, dto);
    return group;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGroupDto, @CurrentUser() user: AuthUser) {
    const group = await this.groupsService.update(id, dto);
    await this.auditService.record(user, 'update', 'group', id, dto);
    return group;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.groupsService.remove(id);
    await this.auditService.record(user, 'delete', 'group', id);
    return { success: true };
  }
}
