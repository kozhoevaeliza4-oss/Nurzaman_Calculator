import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { ClassSubject } from './class-subject.entity';
import { TeacherSubjectAssignment } from './teacher-subject-assignment.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject) private readonly subjectsRepo: Repository<Subject>,
    @InjectRepository(ClassSubject) private readonly classSubjectsRepo: Repository<ClassSubject>,
    @InjectRepository(TeacherSubjectAssignment)
    private readonly assignmentsRepo: Repository<TeacherSubjectAssignment>,
  ) {}

  findAll(): Promise<Subject[]> {
    return this.subjectsRepo.find({ order: { name: 'ASC' } });
  }

  async create(name: string): Promise<Subject> {
    const existing = await this.subjectsRepo.findOne({ where: { name } });
    if (existing) throw new ConflictException('A subject with this name already exists');
    return this.subjectsRepo.save(this.subjectsRepo.create({ name }));
  }

  async remove(id: string): Promise<void> {
    const subject = await this.subjectsRepo.findOne({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    await this.subjectsRepo.remove(subject);
  }

  classSubjects(groupId: string): Promise<ClassSubject[]> {
    return this.classSubjectsRepo.find({ where: { groupId } });
  }

  async assignSubjectToClass(groupId: string, subjectId: string): Promise<ClassSubject> {
    const existing = await this.classSubjectsRepo.findOne({ where: { groupId, subjectId } });
    if (existing) throw new ConflictException('This subject is already in the class curriculum');
    return this.classSubjectsRepo.save(this.classSubjectsRepo.create({ groupId, subjectId }));
  }

  async removeSubjectFromClass(groupId: string, subjectId: string): Promise<void> {
    const link = await this.classSubjectsRepo.findOne({ where: { groupId, subjectId } });
    if (!link) throw new NotFoundException('Not in this class curriculum');
    await this.classSubjectsRepo.remove(link);
  }

  assignments(filter: { groupId?: string; teacherId?: string }): Promise<TeacherSubjectAssignment[]> {
    return this.assignmentsRepo.find({ where: filter });
  }

  async assignTeacher(teacherId: string, subjectId: string, groupId: string): Promise<TeacherSubjectAssignment> {
    const existing = await this.assignmentsRepo.findOne({ where: { teacherId, subjectId, groupId } });
    if (existing) throw new ConflictException('This teacher is already assigned to this subject/class');
    return this.assignmentsRepo.save(this.assignmentsRepo.create({ teacherId, subjectId, groupId }));
  }

  async removeAssignment(id: string): Promise<void> {
    const assignment = await this.assignmentsRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assignmentsRepo.remove(assignment);
  }

  // Used by the gradebook/homework modules to verify a subject teacher is
  // actually assigned to the (groupId, subjectId) they're trying to grade.
  async isAssigned(teacherId: string, subjectId: string, groupId: string): Promise<boolean> {
    const found = await this.assignmentsRepo.findOne({ where: { teacherId, subjectId, groupId } });
    return !!found;
  }
}
