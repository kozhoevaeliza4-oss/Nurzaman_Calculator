import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { LinkChildDto } from './dto/link-child.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentsController {
  constructor(
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  // Section 2 of the TZ: "Родитель — только карточка своего ребёнка."
  @Get('me/children')
  async myChildren(@CurrentUser() user: AuthUser) {
    if (user.role !== Role.PARENT) {
      throw new ForbiddenException('Only parents can use this endpoint');
    }
    const parent = await this.parentsService.findByUserId(user.userId);
    if (!parent) return [];
    return this.parentsService.childrenForParent(parent.id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT, Role.TEACHER)
  @Get()
  findAll() {
    return this.parentsService.findAll();
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT, Role.TEACHER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parentsService.findOne(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateParentDto, @CurrentUser() user: AuthUser) {
    const parent = await this.parentsService.create(dto);
    await this.auditService.record(user, 'create', 'parent', parent.id, dto);
    return parent;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateParentDto, @CurrentUser() user: AuthUser) {
    const parent = await this.parentsService.update(id, dto);
    await this.auditService.record(user, 'update', 'parent', id, dto);
    return parent;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.parentsService.remove(id);
    await this.auditService.record(user, 'delete', 'parent', id);
    return { success: true };
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post(':id/children')
  async linkChild(@Param('id') id: string, @Body() dto: LinkChildDto, @CurrentUser() user: AuthUser) {
    const link = await this.parentsService.linkChild(id, dto);
    await this.auditService.record(user, 'link', 'parent-child', link.id, dto);
    return link;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete(':id/children/:childId')
  async unlinkChild(
    @Param('id') id: string,
    @Param('childId') childId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.parentsService.unlinkChild(id, childId);
    await this.auditService.record(user, 'unlink', 'parent-child', null, { parentId: id, childId });
    return { success: true };
  }
}
