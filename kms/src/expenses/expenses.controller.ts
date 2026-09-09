import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ExpensesService } from './expenses.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { SetPlanDto } from './dto/set-plan.dto';
import { CreateFactDto } from './dto/create-fact.dto';

const STAFF_ROLES = [Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT] as const;

@Roles(...STAFF_ROLES)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly auditService: AuditService,
  ) {}

  @Get('categories')
  findAllCategories() {
    return this.expensesService.findAllCategories();
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    const category = await this.expensesService.createCategory(dto);
    await this.auditService.record(user, 'create', 'expense_category', category.id, dto);
    return category;
  }

  @Post('plans')
  async setPlan(@Body() dto: SetPlanDto, @CurrentUser() user: AuthUser) {
    const plan = await this.expensesService.setPlan(dto);
    await this.auditService.record(user, 'set', 'expense_plan', plan.id, dto);
    return plan;
  }

  @Post('facts')
  async createFact(@Body() dto: CreateFactDto, @CurrentUser() user: AuthUser) {
    const fact = await this.expensesService.createFact(dto);
    await this.auditService.record(user, 'create', 'expense_fact', fact.id, dto);
    return fact;
  }

  @Delete('facts/:id')
  async removeFact(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.expensesService.removeFact(id);
    await this.auditService.record(user, 'delete', 'expense_fact', id);
    return { success: true };
  }

  @Get('plan-vs-fact')
  planVsFact(@Query('period') period: string) {
    return this.expensesService.planVsFact(period);
  }
}
