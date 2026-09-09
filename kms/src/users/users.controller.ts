import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { toSafeUser } from './user.presenter';

// Module 14 gap fix: the director's actual way to create every other
// staff account (parent logins are provisioned via
// POST /parents/:id/create-login instead, since a parent record must
// exist first).
@Roles(Role.DIRECTOR, Role.ADMIN)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(toSafeUser);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return toSafeUser(await this.usersService.findOne(id));
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    const created = await this.usersService.createStaff(dto);
    await this.auditService.record(user, 'create', 'user', created.id, {
      email: dto.email,
      role: dto.role,
    });
    return toSafeUser(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthUser) {
    const updated = await this.usersService.update(id, dto);
    await this.auditService.record(user, 'update', 'user', id, dto);
    return toSafeUser(updated);
  }

  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.usersService.setPassword(id, dto.newPassword);
    await this.auditService.record(user, 'reset-password', 'user', id);
    return { success: true };
  }
}
