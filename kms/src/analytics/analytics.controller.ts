import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { AnalyticsService } from './analytics.service';
import { QueryForecastDto } from './dto/query-forecast.dto';

@Roles(Role.DIRECTOR, Role.ADMIN)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('forecast')
  forecast(@Query() query: QueryForecastDto) {
    return this.analyticsService.forecast(query.months ?? 6);
  }
}
