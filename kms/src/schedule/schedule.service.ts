import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonSlot } from './lesson-slot.entity';
import { ScheduleChange } from './schedule-change.entity';
import { LessonAttendance } from './lesson-attendance.entity';
import { CreateLessonSlotDto } from './dto/create-lesson-slot.dto';
import { CreateSubstitutionDto } from './dto/create-substitution.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(LessonSlot) private readonly slotsRepo: Repository<LessonSlot>,
    @InjectRepository(ScheduleChange) private readonly changesRepo: Repository<ScheduleChange>,
    @InjectRepository(LessonAttendance) private readonly attendanceRepo: Repository<LessonAttendance>,
  ) {}

  async createSlot(dto: CreateLessonSlotDto): Promise<LessonSlot> {
    const existing = await this.slotsRepo.findOne({
      where: { groupId: dto.groupId, dayOfWeek: dto.dayOfWeek, lessonNumber: dto.lessonNumber },
    });
    if (existing) throw new ConflictException('This class already has a lesson at that slot');
    return this.slotsRepo.save(this.slotsRepo.create(dto));
  }

  classSchedule(groupId: string): Promise<LessonSlot[]> {
    return this.slotsRepo.find({ where: { groupId }, order: { dayOfWeek: 'ASC', lessonNumber: 'ASC' } });
  }

  teacherSchedule(teacherId: string): Promise<LessonSlot[]> {
    return this.slotsRepo.find({ where: { teacherId }, order: { dayOfWeek: 'ASC', lessonNumber: 'ASC' } });
  }

  async findSlot(id: string): Promise<LessonSlot> {
    const slot = await this.slotsRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Lesson slot not found');
    return slot;
  }

  async updateSlot(id: string, dto: Partial<CreateLessonSlotDto>): Promise<LessonSlot> {
    const slot = await this.findSlot(id);
    Object.assign(slot, dto);
    return this.slotsRepo.save(slot);
  }

  async removeSlot(id: string): Promise<void> {
    const slot = await this.findSlot(id);
    await this.slotsRepo.remove(slot);
  }

  async createSubstitution(lessonSlotId: string, dto: CreateSubstitutionDto): Promise<ScheduleChange> {
    await this.findSlot(lessonSlotId);
    return this.changesRepo.save(this.changesRepo.create({ ...dto, lessonSlotId }));
  }

  substitutionsForSlot(lessonSlotId: string): Promise<ScheduleChange[]> {
    return this.changesRepo.find({ where: { lessonSlotId }, order: { date: 'DESC' } });
  }

  async markAttendance(lessonSlotId: string, markedBy: string, dto: MarkAttendanceDto): Promise<LessonAttendance[]> {
    await this.findSlot(lessonSlotId);
    const rows = await Promise.all(
      dto.records.map(async (r) => {
        const existing = await this.attendanceRepo.findOne({
          where: { lessonSlotId, studentId: r.studentId, date: dto.date },
        });
        if (existing) {
          existing.status = r.status;
          existing.markedBy = markedBy;
          return this.attendanceRepo.save(existing);
        }
        return this.attendanceRepo.save(
          this.attendanceRepo.create({ lessonSlotId, studentId: r.studentId, date: dto.date, status: r.status, markedBy }),
        );
      }),
    );
    return rows;
  }

  attendanceForLesson(lessonSlotId: string, date: string): Promise<LessonAttendance[]> {
    return this.attendanceRepo.find({ where: { lessonSlotId, date } });
  }

  attendanceForStudent(studentId: string, from?: string, to?: string): Promise<LessonAttendance[]> {
    const qb = this.attendanceRepo.createQueryBuilder('a').where('a.studentId = :studentId', { studentId });
    if (from) qb.andWhere('a.date >= :from', { from });
    if (to) qb.andWhere('a.date <= :to', { to });
    return qb.orderBy('a.date', 'DESC').getMany();
  }
}
