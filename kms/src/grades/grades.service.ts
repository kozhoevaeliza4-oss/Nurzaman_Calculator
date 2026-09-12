import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Grade } from './grade.entity';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(@InjectRepository(Grade) private readonly repo: Repository<Grade>) {}

  create(teacherId: string, dto: CreateGradeDto): Promise<Grade> {
    return this.repo.save(this.repo.create({ ...dto, teacherId }));
  }

  async findOne(id: string): Promise<Grade> {
    const grade = await this.repo.findOne({ where: { id } });
    if (!grade) throw new NotFoundException('Grade not found');
    return grade;
  }

  findForStudent(studentId: string, subjectId?: string): Promise<Grade[]> {
    return this.repo.find({
      where: subjectId ? { studentId, subjectId } : { studentId },
      order: { date: 'DESC' },
    });
  }

  findForClass(groupId: string, subjectId?: string): Promise<Grade[]> {
    return this.repo.find({
      where: subjectId ? { groupId, subjectId } : { groupId },
      order: { date: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateGradeDto): Promise<Grade> {
    const grade = await this.findOne(id);
    Object.assign(grade, dto);
    return this.repo.save(grade);
  }

  async remove(id: string): Promise<void> {
    const grade = await this.findOne(id);
    await this.repo.remove(grade);
  }

  // Module 17: "Средний балл по предмету и по классу за период" - also
  // the raw input Module 20's period-grade auto-calc uses.
  async average(studentId: string, subjectId: string, from?: string, to?: string): Promise<number | null> {
    const where: Record<string, unknown> = { studentId, subjectId };
    if (from && to) where.date = Between(from, to);
    const grades = await this.repo.find({ where });
    if (grades.length === 0) return null;
    const sum = grades.reduce((s, g) => s + g.value, 0);
    return Math.round((sum / grades.length) * 100) / 100;
  }

  async classAverage(groupId: string, subjectId: string, from?: string, to?: string): Promise<number | null> {
    const where: Record<string, unknown> = { groupId, subjectId };
    if (from && to) where.date = Between(from, to);
    const grades = await this.repo.find({ where });
    if (grades.length === 0) return null;
    const sum = grades.reduce((s, g) => s + g.value, 0);
    return Math.round((sum / grades.length) * 100) / 100;
  }
}
