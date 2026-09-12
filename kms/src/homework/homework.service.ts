import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Homework } from './homework.entity';
import { HomeworkSubmission } from './homework-submission.entity';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homework) private readonly repo: Repository<Homework>,
    @InjectRepository(HomeworkSubmission) private readonly submissionsRepo: Repository<HomeworkSubmission>,
  ) {}

  create(teacherId: string, dto: CreateHomeworkDto): Promise<Homework> {
    return this.repo.save(this.repo.create({ ...dto, teacherId }));
  }

  async findOne(id: string): Promise<Homework> {
    const homework = await this.repo.findOne({ where: { id } });
    if (!homework) throw new NotFoundException('Homework not found');
    return homework;
  }

  findForClass(groupId: string, subjectId?: string): Promise<Homework[]> {
    return this.repo.find({
      where: subjectId ? { groupId, subjectId } : { groupId },
      order: { dueDate: 'DESC' },
    });
  }

  async remove(id: string): Promise<void> {
    const homework = await this.findOne(id);
    await this.repo.remove(homework);
  }

  async submit(homeworkId: string, dto: SubmitHomeworkDto): Promise<HomeworkSubmission> {
    await this.findOne(homeworkId);
    const existing = await this.submissionsRepo.findOne({
      where: { homeworkId, studentId: dto.studentId },
    });
    if (existing) {
      existing.done = dto.done;
      existing.note = dto.note ?? existing.note;
      return this.submissionsRepo.save(existing);
    }
    return this.submissionsRepo.save(
      this.submissionsRepo.create({ homeworkId, studentId: dto.studentId, done: dto.done, note: dto.note ?? null }),
    );
  }

  submissionsForHomework(homeworkId: string): Promise<HomeworkSubmission[]> {
    return this.submissionsRepo.find({ where: { homeworkId } });
  }
}
