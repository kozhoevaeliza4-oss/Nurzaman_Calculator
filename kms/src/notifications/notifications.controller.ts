import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from '../parents/parents.service';
import { NotificationsService } from './notifications.service';
import { BroadcastDto } from './dto/broadcast.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(Role.PARENT)
  @Get('me')
  async myInbox(@CurrentUser() user: AuthUser) {
    const parent = await this.parentsService.findByUserId(user.userId);
    if (!parent) throw new ForbiddenException('No parent record linked to this account');
    return this.notificationsService.inboxForParent(parent.id);
  }

  // Module 9: "новости сада" broadcast to every parent.
  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post('broadcast')
  async broadcast(@Body() dto: BroadcastDto, @CurrentUser() user: AuthUser) {
    const recipientCount = await this.notificationsService.broadcastNews(dto.message);
    await this.auditService.record(user, 'broadcast', 'notification', null, {
      message: dto.message,
      recipientCount,
    });
    return { recipientCount };
  }
}
