import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from '../parents/parents.service';
import { ChildrenService } from '../children/children.service';
import { GroupsService } from '../groups/groups.service';
import { SubjectsService } from '../subjects/subjects.service';
import { QueryChildrenDto } from '../children/dto/query-children.dto';
import { PeriodsService } from './periods.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { SetExamResultsDto } from './dto/set-exam-results.dto';
import { OverridePeriodGradeDto } from './dto/override-period-grade.dto';
import { buildTranscriptPdf } from './transcript.util';

const SCHOOL_STAFF = [
  Role.DIRECTOR,
  Role.ADMIN,
  Role.DEPUTY_HEAD,
  Role.HOMEROOM_TEACHER,
  Role.SUBJECT_TEACHER,
];
const SCHOOL_MANAGERS = [Role.DIRECTOR, Role.ADMIN, Role.DEPUTY_HEAD];

// Module 20: учебные периоды, итоговые оценки, экзамены, табель (PDF).
@Roles(...SCHOOL_STAFF)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('periods')
export class PeriodsController {
  constructor(
    private readonly periodsService: PeriodsService,
    private readonly childrenService: ChildrenService,
    private readonly groupsService: GroupsService,
    private readonly subjectsService: SubjectsService,
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll() {
    return this.periodsService.findAll();
  }

  @Roles(...SCHOOL_MANAGERS)
  @Post()
  async create(@Body() dto: CreatePeriodDto, @CurrentUser() user: AuthUser) {
    const period = await this.periodsService.create(dto);
    await this.auditService.record(user, 'create', 'academic_period', period.id, dto);
    return period;
  }

  @Post(':id/recalculate/:groupId/:subjectId')
  async recalculate(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === Role.SUBJECT_TEACHER) {
      const assigned = await this.subjectsService.isAssigned(user.userId, subjectId, groupId);
      if (!assigned) throw new ForbiddenException('You are not assigned to this class/subject');
    }
    const roster = await this.childrenService.findAll({ groupId } as QueryChildrenDto);
    const rows = await this.periodsService.recalculate(id, groupId, subjectId, roster.map((c) => c.id));
    await this.auditService.record(user, 'recalculate-period-grades', 'academic_period', id, { groupId, subjectId });
    return rows;
  }

  @Put('grades/:id')
  async overridePeriodGrade(
    @Param('id') id: string,
    @Body() dto: OverridePeriodGradeDto,
    @CurrentUser() user: AuthUser,
  ) {
    const row = await this.periodsService.overridePeriodGrade(id, dto.manualOverride);
    await this.auditService.record(user, 'override-period-grade', 'period_grade', id, dto);
    return row;
  }

  @Get(':id/grades/class/:groupId')
  async classPeriodGrades(@Param('id') id: string, @Param('groupId') groupId: string) {
    const roster = await this.childrenService.findAll({ groupId } as QueryChildrenDto);
    return this.periodsService.periodGradesForClass(id, groupId, roster.map((c) => c.id));
  }

  @Get(':id/grades/student/:studentId')
  studentPeriodGrades(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.periodsService.periodGradesForStudent(id, studentId);
  }

  @Roles(...SCHOOL_MANAGERS)
  @Post(':id/exams')
  async createExam(@Param('id') id: string, @Body() dto: CreateExamDto, @CurrentUser() user: AuthUser) {
    const exam = await this.periodsService.createExam(id, dto);
    await this.auditService.record(user, 'create', 'exam', exam.id, dto);
    return exam;
  }

  @Get(':id/exams')
  exams(@Param('id') id: string, @Query('groupId') groupId?: string) {
    return this.periodsService.examsForPeriod(id, groupId);
  }

  @Post('exams/:examId/results')
  async setExamResults(@Param('examId') examId: string, @Body() dto: SetExamResultsDto, @CurrentUser() user: AuthUser) {
    const results = await this.periodsService.setExamResults(examId, dto);
    await this.auditService.record(user, 'set-exam-results', 'exam', examId, dto);
    return results;
  }

  @Get('exams/:examId/results')
  examResults(@Param('examId') examId: string) {
    return this.periodsService.examResults(examId);
  }

  // Staff-facing transcript download.
  @Get(':id/transcript/:studentId')
  async transcript(@Param('id') id: string, @Param('studentId') studentId: string, @Res() res: Response) {
    await this.sendTranscript(id, studentId, res);
  }

  // Module 6/20: parent's PDF transcript download for their own child.
  @Roles(Role.PARENT)
  @Get('me/children/:studentId/transcript')
  async myChildTranscript(
    @Param('studentId') studentId: string,
    @Query('periodId') periodId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const owns = await this.parentsService.ownsChild(user.userId, studentId);
    if (!owns) throw new ForbiddenException('You do not have access to this child');
    await this.sendTranscript(periodId, studentId, res);
  }

  private async sendTranscript(periodId: string, studentId: string, res: Response): Promise<void> {
    const [period, child, periodGrades, subjects] = await Promise.all([
      this.periodsService.findOne(periodId),
      this.childrenService.findOne(studentId),
      this.periodsService.periodGradesForStudent(periodId, studentId),
      this.subjectsService.findAll(),
    ]);
    const group = child.groupId ? await this.groupsService.findOne(child.groupId) : null;
    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

    const pdf = await buildTranscriptPdf({
      studentName: child.fullName,
      periodName: period.name,
      academicYear: period.academicYear,
      className: group?.name ?? '—',
      rows: periodGrades.map((pg) => ({
        subjectName: subjectNameById.get(pg.subjectId) ?? pg.subjectId,
        finalValue: pg.finalValue,
      })),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transcript.pdf"; filename*=UTF-8''${encodeURIComponent(`transcript-${child.fullName}.pdf`)}`,
    );
    res.send(pdf);
  }
}
