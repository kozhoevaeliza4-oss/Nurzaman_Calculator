import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { OneCService } from './onec.service';
import { ImportReconciliationDto } from './dto/import-reconciliation.dto';

// Intended for a 1C-side integration script authenticating as an
// accountant/admin service account — see README for the production note
// on a dedicated machine-to-machine credential instead of a human JWT.
@Roles(Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onec')
export class OneCController {
  constructor(
    private readonly oneCService: OneCService,
    private readonly auditService: AuditService,
  ) {}

  @Get('export/payments')
  exportPayments() {
    return this.oneCService.exportPayments();
  }

  @Get('export/contragents')
  exportContragents() {
    return this.oneCService.exportContragents();
  }

  @Post('import/reconciliation')
  async importReconciliation(@Body() dto: ImportReconciliationDto, @CurrentUser() user: AuthUser) {
    const result = await this.oneCService.importReconciliation(dto);
    await this.auditService.record(user, 'import', 'one_c_reconciliation', null, result);
    return result;
  }
}
