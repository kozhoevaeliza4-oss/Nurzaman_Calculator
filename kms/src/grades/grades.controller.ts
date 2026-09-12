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
import { SubjectsService } from '../subjects/subjects.service';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

const SCHOOL_STAFF = [
  Role.DIRECTOR,
  Role.ADMIN,
  Role.DEPUTY_HEAD,
  Role.HOMEROOM_TEACHER,
  Role.SUBJECT_TEACHER,
];

// Module 17: электронный дневник. A subject teacher may only grade the
// (class, subject) pairs they're actually assigned (module 16); director/
// admin/deputy_head/homeroom_teacher have oversight access.
@Roles(...SCHOOL_STAFF)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(
    private readonly gradesService: GradesService,
    private readonly subjectsService: SubjectsService,
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  async create(@Body() dto: CreateGradeDto, @CurrentUser() user: AuthUser) {
    await this.assertCanGrade(user, dto.groupId, dto.subjectId);
    const grade = await this.gradesService.create(user.userId, dto);
    await this.auditService.record(user, 'create', 'grade', grade.id, dto);
    return grade;
  }

  @Get('student/:studentId')
  findForStudent(@Param('studentId') studentId: string, @Query('subjectId') subjectId?: string) {
    return this.gradesService.findForStudent(studentId, subjectId);
  }

  @Get('class/:groupId')
  findForClass(@Param('groupId') groupId: string, @Query('subjectId') subjectId?: string) {
    return this.gradesService.findForClass(groupId, subjectId);
  }

  @Get('average')
  average(
    @Query('studentId') studentId: string,
    @Query('subjectId') subjectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.gradesService.average(studentId, subjectId, from, to).then((value) => ({ average: value }));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGradeDto, @CurrentUser() user: AuthUser) {
    const grade = await this.gradesService.findOne(id);
    await this.assertCanGrade(user, grade.groupId, grade.subjectId);
    const updated = await this.gradesService.update(id, dto);
    await this.auditService.record(user, 'update', 'grade', id, dto);
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const grade = await this.gradesService.findOne(id);
    await this.assertCanGrade(user, grade.groupId, grade.subjectId);
    await this.gradesService.remove(id);
    await this.auditService.record(user, 'delete', 'grade', id);
    return { success: true };
  }

  // Module 6/17: parent's real-time view of their child's grades.
  @Roles(Role.PARENT)
  @Get('me/children/:studentId')
  async myChildGrades(@Param('studentId') studentId: string, @CurrentUser() user: AuthUser) {
    const owns = await this.parentsService.ownsChild(user.userId, studentId);
    if (!owns) throw new ForbiddenException('You do not have access to this child');
    return this.gradesService.findForStudent(studentId);
  }

  private async assertCanGrade(user: AuthUser, groupId: string, subjectId: string): Promise<void> {
    if (user.role === Role.SUBJECT_TEACHER) {
      const assigned = await this.subjectsService.isAssigned(user.userId, subjectId, groupId);
      if (!assigned) throw new ForbiddenException('You are not assigned to this class/subject');
    }
  }
}
