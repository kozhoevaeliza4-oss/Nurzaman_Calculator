import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from '../parents/parents.service';
import { ChildrenService } from '../children/children.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduleService } from './schedule.service';
import { QueryChildrenDto } from '../children/dto/query-children.dto';
import { CreateLessonSlotDto } from './dto/create-lesson-slot.dto';
import { CreateSubstitutionDto } from './dto/create-substitution.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const SCHOOL_STAFF = [
  Role.DIRECTOR,
  Role.ADMIN,
  Role.DEPUTY_HEAD,
  Role.HOMEROOM_TEACHER,
  Role.SUBJECT_TEACHER,
];
const SCHOOL_MANAGERS = [Role.DIRECTOR, Role.ADMIN, Role.DEPUTY_HEAD];

// Module 18: расписание уроков + замены; per-lesson posещаемость lives
// here too since it's keyed off a lesson slot.
@Roles(...SCHOOL_STAFF)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly childrenService: ChildrenService,
    private readonly notificationsService: NotificationsService,
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(...SCHOOL_MANAGERS)
  @Post()
  async createSlot(@Body() dto: CreateLessonSlotDto, @CurrentUser() user: AuthUser) {
    const slot = await this.scheduleService.createSlot(dto);
    await this.auditService.record(user, 'create', 'lesson_slot', slot.id, dto);
    return slot;
  }

  @Get('class/:groupId')
  classSchedule(@Param('groupId') groupId: string) {
    return this.scheduleService.classSchedule(groupId);
  }

  @Get('me')
  mySchedule(@CurrentUser() user: AuthUser) {
    return this.scheduleService.teacherSchedule(user.userId);
  }

  @Roles(...SCHOOL_MANAGERS)
  @Put(':id')
  async updateSlot(@Param('id') id: string, @Body() dto: Partial<CreateLessonSlotDto>, @CurrentUser() user: AuthUser) {
    const slot = await this.scheduleService.updateSlot(id, dto);
    await this.auditService.record(user, 'update', 'lesson_slot', id, dto);
    return slot;
  }

  @Roles(...SCHOOL_MANAGERS)
  @Delete(':id')
  async removeSlot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.scheduleService.removeSlot(id);
    await this.auditService.record(user, 'delete', 'lesson_slot', id);
    return { success: true };
  }

  // Module 18: "Изменения в расписании (замены) с уведомлением" - notifies
  // every parent of every student in the affected class.
  @Roles(...SCHOOL_MANAGERS)
  @Post(':id/substitutions')
  async createSubstitution(
    @Param('id') id: string,
    @Body() dto: CreateSubstitutionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const slot = await this.scheduleService.findSlot(id);
    const change = await this.scheduleService.createSubstitution(id, dto);
    await this.auditService.record(user, 'create', 'schedule_change', change.id, dto);

    const message = dto.cancelled
      ? `Урок отменён на ${dto.date}${dto.reason ? `: ${dto.reason}` : ''}`
      : `Замена на ${dto.date}${dto.newRoom ? `, кабинет ${dto.newRoom}` : ''}${dto.reason ? `: ${dto.reason}` : ''}`;
    const roster = await this.childrenService.findAll({ groupId: slot.groupId } as QueryChildrenDto);
    await Promise.all(
      roster.map((child) => this.notificationsService.notifyParentsOfChild(child.id, message, 'schedule_change')),
    );
    return change;
  }

  @Get(':id/substitutions')
  substitutions(@Param('id') id: string) {
    return this.scheduleService.substitutionsForSlot(id);
  }

  @Roles(Role.HOMEROOM_TEACHER, Role.SUBJECT_TEACHER, ...SCHOOL_MANAGERS)
  @Post(':id/attendance')
  async markAttendance(@Param('id') id: string, @Body() dto: MarkAttendanceDto, @CurrentUser() user: AuthUser) {
    const rows = await this.scheduleService.markAttendance(id, user.userId, dto);
    await this.auditService.record(user, 'mark-attendance', 'lesson_slot', id, { date: dto.date });
    return rows;
  }

  @Get(':id/attendance')
  attendanceForLesson(@Param('id') id: string, @Query('date') date: string) {
    return this.scheduleService.attendanceForLesson(id, date);
  }

  @Get('students/:studentId/attendance')
  attendanceForStudent(
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.scheduleService.attendanceForStudent(studentId, from, to);
  }

  // Module 6/18: parent's real-time view of their child's schedule and
  // per-lesson attendance.
  @Roles(Role.PARENT)
  @Get('me/children/:studentId')
  async myChildSchedule(@Param('studentId') studentId: string, @CurrentUser() user: AuthUser) {
    const owns = await this.parentsService.ownsChild(user.userId, studentId);
    if (!owns) throw new ForbiddenException('You do not have access to this child');
    const child = await this.childrenService.findOne(studentId);
    if (!child.groupId) return [];
    return this.scheduleService.classSchedule(child.groupId);
  }

  @Roles(Role.PARENT)
  @Get('me/children/:studentId/attendance')
  async myChildAttendance(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const owns = await this.parentsService.ownsChild(user.userId, studentId);
    if (!owns) throw new ForbiddenException('You do not have access to this child');
    return this.scheduleService.attendanceForStudent(studentId, from, to);
  }
}
