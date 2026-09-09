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
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from '../parents/parents.service';
import { ChargesService } from './charges.service';
import { PaymentsService } from './payments.service';
import { BalancesService } from './balances.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { AccrueMonthlyDto } from './dto/accrue-monthly.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

const STAFF_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT] as const;

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly chargesService: ChargesService,
    private readonly paymentsService: PaymentsService,
    private readonly balancesService: BalancesService,
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  // --- Staff-facing endpoints -------------------------------------------

  @Roles(...STAFF_ROLES)
  @Get('debtors')
  listDebtors() {
    return this.balancesService.listDebtors();
  }

  @Roles(...STAFF_ROLES)
  @Get('children/:childId/balance')
  getBalance(@Param('childId') childId: string) {
    return this.balancesService.getBalance(childId);
  }

  @Roles(...STAFF_ROLES)
  @Get('children/:childId/history')
  async getHistory(@Param('childId') childId: string) {
    const [charges, payments] = await Promise.all([
      this.chargesService.findForChild(childId),
      this.paymentsService.findForChild(childId),
    ]);
    return { charges, payments };
  }

  @Roles(...STAFF_ROLES)
  @Post('charges')
  async createCharge(@Body() dto: CreateChargeDto, @CurrentUser() user: AuthUser) {
    const charge = await this.chargesService.create(dto);
    await this.auditService.record(user, 'create', 'charge', charge.id, dto);
    return charge;
  }

  @Roles(...STAFF_ROLES)
  @Post('groups/:groupId/accrue-monthly')
  async accrueMonthly(
    @Param('groupId') groupId: string,
    @Body() dto: AccrueMonthlyDto,
    @CurrentUser() user: AuthUser,
  ) {
    const charges = await this.chargesService.accrueMonthlyForGroup(groupId, dto.dueDate);
    await this.auditService.record(user, 'accrue-monthly', 'group', groupId, {
      dueDate: dto.dueDate,
      chargesCreated: charges.length,
    });
    return charges;
  }

  @Roles(...STAFF_ROLES)
  @Post('payments')
  async createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    const { payment, receipt } = await this.paymentsService.create(dto, user.userId);
    await this.auditService.record(user, 'create', 'payment', payment.id, dto);
    return { payment, receipt };
  }

  @Roles(...STAFF_ROLES)
  @Get('payments/:paymentId/receipt')
  getReceipt(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getReceipt(paymentId);
  }

  // --- Parent-facing endpoints --------------------------------------------
  // Section 2 of the TZ: a parent only ever sees their own child's data.

  @Roles(Role.PARENT)
  @Get('me/children/:childId/balance')
  async getMyChildBalance(@Param('childId') childId: string, @CurrentUser() user: AuthUser) {
    await this.assertOwnChild(user, childId);
    return this.balancesService.getBalance(childId);
  }

  @Roles(Role.PARENT)
  @Get('me/children/:childId/history')
  async getMyChildHistory(@Param('childId') childId: string, @CurrentUser() user: AuthUser) {
    await this.assertOwnChild(user, childId);
    const [charges, payments] = await Promise.all([
      this.chargesService.findForChild(childId),
      this.paymentsService.findForChild(childId),
    ]);
    return { charges, payments };
  }

  @Roles(Role.PARENT)
  @Get('me/payments/:paymentId/receipt')
  async getMyReceipt(@Param('paymentId') paymentId: string, @CurrentUser() user: AuthUser) {
    const receipt = await this.paymentsService.getReceipt(paymentId);
    await this.assertOwnChild(user, receipt.childId);
    return receipt;
  }

  private async assertOwnChild(user: AuthUser, childId: string): Promise<void> {
    const owns = await this.parentsService.ownsChild(user.userId, childId);
    if (!owns) {
      throw new ForbiddenException('You do not have access to this child');
    }
  }
}
