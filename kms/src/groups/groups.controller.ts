import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { effectiveDirections } from '../common/direction-scope';
import { AuditService } from '../audit/audit.service';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { QueryGroupsDto } from './dto/query-groups.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly auditService: AuditService,
  ) {}

  // Groups (Кидс) / classes (Школа) carry capacity/teacher assignment info
  // that isn't a parent's business — only staff roles get to list or look
  // one up, and only within their own direction.
  @Roles(
    Role.DIRECTOR,
    Role.ADMIN,
    Role.ACCOUNTANT,
    Role.TEACHER,
    Role.MEDIC,
    Role.DEPUTY_HEAD,
    Role.HOMEROOM_TEACHER,
    Role.SUBJECT_TEACHER,
  )
  @Get()
  findAll(@Query() query: QueryGroupsDto, @CurrentUser() user: AuthUser) {
    return this.groupsService.findAll(effectiveDirections(user), query.direction);
  }

  @Roles(
    Role.DIRECTOR,
    Role.ADMIN,
    Role.ACCOUNTANT,
    Role.TEACHER,
    Role.MEDIC,
    Role.DEPUTY_HEAD,
    Role.HOMEROOM_TEACHER,
    Role.SUBJECT_TEACHER,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.findOne(id, effectiveDirections(user));
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.DEPUTY_HEAD)
  @Post()
  async create(@Body() dto: CreateGroupDto, @CurrentUser() user: AuthUser) {
    const group = await this.groupsService.create(dto);
    await this.auditService.record(user, 'create', 'group', group.id, dto);
    return group;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.DEPUTY_HEAD)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGroupDto, @CurrentUser() user: AuthUser) {
    await this.groupsService.findOne(id, effectiveDirections(user));
    const group = await this.groupsService.update(id, dto);
    await this.auditService.record(user, 'update', 'group', id, dto);
    return group;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.DEPUTY_HEAD)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.groupsService.findOne(id, effectiveDirections(user));
    await this.groupsService.remove(id);
    await this.auditService.record(user, 'delete', 'group', id);
    return { success: true };
  }
}
