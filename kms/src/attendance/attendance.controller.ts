import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from '../parents/parents.service';
import { AttendanceService } from './attendance.service';
import { ScanQrDto } from './dto/scan-qr.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  // Module 5: "Сканирование кода камерой смартфона воспитателем или
  // родителем при приходе/уходе." Open to every role except accountant/
  // medic (not part of the drop-off/pick-up flow); a teacher may only
  // scan children in their own group, a parent only their own child.
  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER, Role.PARENT)
  @Post('scan')
  async scan(@Body() dto: ScanQrDto, @CurrentUser() user: AuthUser) {
    const child = await this.attendanceService.resolveChildByCode(dto.code);

    if (user.role === Role.TEACHER && child.groupId !== user.groupId) {
      throw new ForbiddenException('This child is not in your group');
    }
    if (user.role === Role.PARENT) {
      await this.assertOwnChild(user, child.id);
    }

    const record = await this.attendanceService.recordScan(child.id, user);
    await this.auditService.record(user, 'scan', 'attendance', record.id, {
      childId: child.id,
      eventType: record.eventType,
    });
    return { ...record, fullName: child.fullName };
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER, Role.ACCOUNTANT, Role.MEDIC)
  @Get('children/:childId/history')
  getHistory(@Param('childId') childId: string) {
    return this.attendanceService.findForChild(childId);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER)
  @Get('groups/:groupId/today')
  async getTodayRoster(@Param('groupId') groupId: string, @CurrentUser() user: AuthUser) {
    if (user.role === Role.TEACHER && groupId !== user.groupId) {
      throw new ForbiddenException('This is not your group');
    }
    return this.attendanceService.todayRosterForGroup(groupId);
  }

  @Roles(Role.PARENT)
  @Get('me/children/:childId/history')
  async getMyChildHistory(@Param('childId') childId: string, @CurrentUser() user: AuthUser) {
    await this.assertOwnChild(user, childId);
    return this.attendanceService.findForChild(childId);
  }

  private async assertOwnChild(user: AuthUser, childId: string): Promise<void> {
    const owns = await this.parentsService.ownsChild(user.userId, childId);
    if (!owns) {
      throw new ForbiddenException('You do not have access to this child');
    }
  }
}
