import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { toCsv } from './csv.util';

@Roles(Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  async attendance(@Query() query: QueryReportDto, @Res({ passthrough: true }) res: Response) {
    const rows = await this.reportsService.attendanceReport(query.from, query.to);
    return this.respond(rows, query.format, res, 'attendance');
  }

  @Get('finance')
  finance(@Query() query: QueryReportDto) {
    return this.reportsService.financeReport(query.from, query.to);
  }

  @Get('debt')
  async debt(@Query('format') format: 'json' | 'csv' | undefined, @Res({ passthrough: true }) res: Response) {
    const rows = await this.reportsService.debtReport();
    return this.respond(rows, format, res, 'debt');
  }

  private respond(rows: object[], format: 'json' | 'csv' | undefined, res: Response, name: string) {
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
      return toCsv(rows);
    }
    return rows;
  }
}
