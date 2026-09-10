import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ParentsService } from '../parents/parents.service';
import { BalancesService } from '../finance/balances.service';
import { AttendanceService } from '../attendance/attendance.service';
import { MenuService } from '../menu/menu.service';
import { NotificationsService } from '../notifications/notifications.service';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Module 6: "Личный кабинет родителя ... посещаемость, оплаты, чеки,
// задолженность, меню, новости" — one call instead of five, for the web
// personal cabinet (and, later, the parent mobile app — Module 13 — to
// call the same endpoint).
@Roles(Role.PARENT)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly parentsService: ParentsService,
    private readonly balancesService: BalancesService,
    private readonly attendanceService: AttendanceService,
    private readonly menuService: MenuService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    const parent = await this.parentsService.findByUserId(user.userId);
    if (!parent) throw new ForbiddenException('No parent record linked to this account');

    const links = await this.parentsService.childrenForParent(parent.id);
    const date = today();

    const [children, todayMenu, notifications] = await Promise.all([
      Promise.all(
        links.map(async (link) => ({
          childId: link.childId,
          fullName: link.child?.fullName,
          allergies: link.child?.allergies ?? [],
          relationType: link.relationType,
          balance: await this.balancesService.getBalance(link.childId),
          recentAttendance: (await this.attendanceService.findForChild(link.childId)).slice(0, 5),
        })),
      ),
      this.menuService.findForRange(date, date),
      this.notificationsService.inboxForParent(parent.id, 1, 10),
    ]);

    return { children, todayMenu, notifications: notifications.items };
  }
}
