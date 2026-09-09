import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { PaginationQueryDto } from '../common/pagination.dto';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

// Module 14: read side of the audit log — director-only, since it can
// reveal who did what to any record in the system.
@Roles(Role.DIRECTOR)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query() query: QueryAuditDto, @Query() pagination: PaginationQueryDto) {
    return this.auditService.findAllPaginated(query, pagination.page ?? 1, pagination.pageSize ?? 25);
  }
}
