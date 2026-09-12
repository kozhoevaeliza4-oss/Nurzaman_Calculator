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
import * as QRCode from 'qrcode';
import { AuditService } from '../audit/audit.service';
import { effectiveDirections } from '../common/direction-scope';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { QueryChildrenDto } from './dto/query-children.dto';
import { PaginationQueryDto } from '../common/pagination.dto';

// Parents access their child's record via /parents/me, not this controller
// (see section 2 of the TZ: "Родитель — только карточка своего ребёнка").
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
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('children')
export class ChildrenController {
  constructor(
    private readonly childrenService: ChildrenService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(
    @Query() query: QueryChildrenDto,
    @Query() pagination: PaginationQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    // A homeroom teacher/воспитатель is pinned to their own class/group,
    // same mechanism, different role.
    const scopedGroupId =
      user.role === Role.TEACHER || user.role === Role.HOMEROOM_TEACHER ? user.groupId : undefined;
    return this.childrenService.findAllPaginated(
      query,
      pagination.page ?? 1,
      pagination.pageSize ?? 25,
      scopedGroupId,
      effectiveDirections(user),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.childrenService.findOne(id, effectiveDirections(user));
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateChildDto, @CurrentUser() user: AuthUser) {
    const child = await this.childrenService.create(dto);
    await this.auditService.record(user, 'create', 'child', child.id, dto);
    return child;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.MEDIC)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChildDto, @CurrentUser() user: AuthUser) {
    await this.childrenService.findOne(id, effectiveDirections(user));
    const child = await this.childrenService.update(id, dto);
    await this.auditService.record(user, 'update', 'child', id, dto);
    return child;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.childrenService.findOne(id, effectiveDirections(user));
    await this.childrenService.remove(id);
    await this.auditService.record(user, 'delete', 'child', id);
    return { success: true };
  }

  // Module 5: printable badge material for the child's QR code.
  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER, Role.HOMEROOM_TEACHER)
  @Get(':id/qr-code')
  async getQrCode(@Param('id') id: string) {
    const child = await this.childrenService.findOne(id);
    const qrImageDataUrl = await QRCode.toDataURL(child.qrCode);
    return { childId: child.id, qrCode: child.qrCode, qrImageDataUrl };
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post(':id/qr-code/regenerate')
  async regenerateQrCode(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const child = await this.childrenService.regenerateQrCode(id);
    await this.auditService.record(user, 'regenerate-qr-code', 'child', id);
    const qrImageDataUrl = await QRCode.toDataURL(child.qrCode);
    return { childId: child.id, qrCode: child.qrCode, qrImageDataUrl };
  }
}
