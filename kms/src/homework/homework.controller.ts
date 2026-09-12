import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
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
import { SubjectsService } from '../subjects/subjects.service';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';

const SCHOOL_STAFF = [
  Role.DIRECTOR,
  Role.ADMIN,
  Role.DEPUTY_HEAD,
  Role.HOMEROOM_TEACHER,
  Role.SUBJECT_TEACHER,
];

// Module 19: домашние задания.
@Roles(...SCHOOL_STAFF)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('homework')
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly subjectsService: SubjectsService,
    private readonly parentsService: ParentsService,
    private readonly childrenService: ChildrenService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  async create(@Body() dto: CreateHomeworkDto, @CurrentUser() user: AuthUser) {
    if (user.role === Role.SUBJECT_TEACHER) {
      const assigned = await this.subjectsService.isAssigned(user.userId, dto.subjectId, dto.groupId);
      if (!assigned) throw new ForbiddenException('You are not assigned to this class/subject');
    }
    const homework = await this.homeworkService.create(user.userId, dto);
    await this.auditService.record(user, 'create', 'homework', homework.id, dto);
    return homework;
  }

  @Get('class/:groupId')
  findForClass(@Param('groupId') groupId: string, @Query('subjectId') subjectId?: string) {
    return this.homeworkService.findForClass(groupId, subjectId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.homeworkService.remove(id);
    await this.auditService.record(user, 'delete', 'homework', id);
    return { success: true };
  }

  @Get(':id/submissions')
  submissions(@Param('id') id: string) {
    return this.homeworkService.submissionsForHomework(id);
  }

  // Marking one's own child's homework done - open to the same school
  // staff plus the parent (self-scoped, checked below).
  @Roles(...SCHOOL_STAFF, Role.PARENT)
  @Post(':id/submissions')
  async submit(@Param('id') id: string, @Body() dto: SubmitHomeworkDto, @CurrentUser() user: AuthUser) {
    if (user.role === Role.PARENT) {
      const owns = await this.parentsService.ownsChild(user.userId, dto.studentId);
      if (!owns) throw new ForbiddenException('You do not have access to this child');
    }
    return this.homeworkService.submit(id, dto);
  }

  // Module 6/19: parent's view of their child's homework.
  @Roles(Role.PARENT)
  @Get('me/children/:studentId')
  async myChildHomework(@Param('studentId') studentId: string, @CurrentUser() user: AuthUser) {
    const owns = await this.parentsService.ownsChild(user.userId, studentId);
    if (!owns) throw new ForbiddenException('You do not have access to this child');
    const child = await this.childrenService.findOne(studentId);
    if (!child.groupId) return [];
    return this.homeworkService.findForClass(child.groupId);
  }
}
