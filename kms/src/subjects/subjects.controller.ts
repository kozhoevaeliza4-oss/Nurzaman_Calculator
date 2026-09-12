import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';

const SCHOOL_STAFF = [
  Role.DIRECTOR,
  Role.ADMIN,
  Role.DEPUTY_HEAD,
  Role.HOMEROOM_TEACHER,
  Role.SUBJECT_TEACHER,
];
const SCHOOL_MANAGERS = [Role.DIRECTOR, Role.ADMIN, Role.DEPUTY_HEAD];

// Module 16: справочник предметов, учебный план класса, назначение
// учителей-предметников. Школа-only (Кидс не использует предметы).
@Roles(...SCHOOL_STAFF)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }

  @Roles(...SCHOOL_MANAGERS)
  @Post()
  async create(@Body() dto: CreateSubjectDto, @CurrentUser() user: AuthUser) {
    const subject = await this.subjectsService.create(dto.name);
    await this.auditService.record(user, 'create', 'subject', subject.id, dto);
    return subject;
  }

  @Roles(...SCHOOL_MANAGERS)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.subjectsService.remove(id);
    await this.auditService.record(user, 'delete', 'subject', id);
    return { success: true };
  }

  @Get('classes/:groupId')
  classSubjects(@Param('groupId') groupId: string) {
    return this.subjectsService.classSubjects(groupId);
  }

  @Roles(...SCHOOL_MANAGERS)
  @Post('classes/:groupId/:subjectId')
  async assignToClass(
    @Param('groupId') groupId: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const link = await this.subjectsService.assignSubjectToClass(groupId, subjectId);
    await this.auditService.record(user, 'assign-subject-to-class', 'class_subject', link.id, {
      groupId,
      subjectId,
    });
    return link;
  }

  @Roles(...SCHOOL_MANAGERS)
  @Delete('classes/:groupId/:subjectId')
  async removeFromClass(
    @Param('groupId') groupId: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.subjectsService.removeSubjectFromClass(groupId, subjectId);
    await this.auditService.record(user, 'remove-subject-from-class', 'class_subject', null, {
      groupId,
      subjectId,
    });
    return { success: true };
  }

  @Get('assignments')
  assignments(@Query('groupId') groupId?: string, @Query('teacherId') teacherId?: string) {
    return this.subjectsService.assignments({ groupId, teacherId });
  }

  // A subject teacher's own worklist - which classes/subjects they teach,
  // used by the mobile/web gradebook screens to build the class picker.
  @Get('assignments/me')
  myAssignments(@CurrentUser() user: AuthUser) {
    return this.subjectsService.assignments({ teacherId: user.userId });
  }

  @Roles(...SCHOOL_MANAGERS)
  @Post('assignments')
  async assignTeacher(@Body() dto: AssignTeacherDto, @CurrentUser() user: AuthUser) {
    const assignment = await this.subjectsService.assignTeacher(dto.teacherId, dto.subjectId, dto.groupId);
    await this.auditService.record(user, 'assign-teacher', 'teacher_subject_assignment', assignment.id, dto);
    return assignment;
  }

  @Roles(...SCHOOL_MANAGERS)
  @Delete('assignments/:id')
  async removeAssignment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.subjectsService.removeAssignment(id);
    await this.auditService.record(user, 'remove-teacher-assignment', 'teacher_subject_assignment', id);
    return { success: true };
  }
}
