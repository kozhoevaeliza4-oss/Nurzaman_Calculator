import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Roles(Role.DIRECTOR, Role.ADMIN, Role.ACCOUNTANT)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance/tariffs')
export class TariffsController {
  constructor(
    private readonly tariffsService: TariffsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll() {
    return this.tariffsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tariffsService.findOne(id);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateTariffDto, @CurrentUser() user: AuthUser) {
    const tariff = await this.tariffsService.create(dto);
    await this.auditService.record(user, 'create', 'tariff', tariff.id, dto);
    return tariff;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTariffDto, @CurrentUser() user: AuthUser) {
    const tariff = await this.tariffsService.update(id, dto);
    await this.auditService.record(user, 'update', 'tariff', id, dto);
    return tariff;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.tariffsService.remove(id);
    await this.auditService.record(user, 'delete', 'tariff', id);
    return { success: true };
  }
}
