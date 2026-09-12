import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { effectiveDirections } from '../common/direction-scope';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

@Roles(Role.DIRECTOR, Role.ADMIN)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@Query() query: QueryDashboardDto, @CurrentUser() user: AuthUser) {
    const allowed = effectiveDirections(user);
    const requestedIsAllowed = !query.direction || !allowed || allowed.includes(query.direction);
    const narrowed = query.direction && requestedIsAllowed ? [query.direction] : allowed;
    return this.dashboardService.summary(query.from, query.to, narrowed);
  }
}
