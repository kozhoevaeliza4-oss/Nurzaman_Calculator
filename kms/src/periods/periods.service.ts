import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicPeriod } from './academic-period.entity';
import { PeriodGrade } from './period-grade.entity';
import { Exam } from './exam.entity';
import { ExamResult } from './exam-result.entity';
import { CreatePeriodDto } from './dto/create-period.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { SetExamResultsDto } from './dto/set-exam-results.dto';
import { GradesService } from '../grades/grades.service';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(AcademicPeriod) private readonly periodsRepo: Repository<AcademicPeriod>,
    @InjectRepository(PeriodGrade) private readonly periodGradesRepo: Repository<PeriodGrade>,
    @InjectRepository(Exam) private readonly examsRepo: Repository<Exam>,
    @InjectRepository(ExamResult) private readonly examResultsRepo: Repository<ExamResult>,
    private readonly gradesService: GradesService,
  ) {}

  findAll(): Promise<AcademicPeriod[]> {
    return this.periodsRepo.find({ order: { startDate: 'DESC' } });
  }

  create(dto: CreatePeriodDto): Promise<AcademicPeriod> {
    return this.periodsRepo.save(this.periodsRepo.create(dto));
  }

  async findOne(id: string): Promise<AcademicPeriod> {
    const period = await this.periodsRepo.findOne({ where: { id } });
    if (!period) throw new NotFoundException('Academic period not found');
    return period;
  }

  // Module 20: "Итоговые оценки за период — автоматический расчёт на
  // основе текущих оценок." Recomputes one subject for a whole class from
  // the raw Grade rows (module 17) inside the period's date range, leaving
  // any existing manual override in place.
  async recalculate(periodId: string, groupId: string, subjectId: string, studentIds: string[]): Promise<PeriodGrade[]> {
    const period = await this.findOne(periodId);
    return Promise.all(
      studentIds.map(async (studentId) => {
        const avg = await this.gradesService.average(studentId, subjectId, period.startDate, period.endDate);
        let row = await this.periodGradesRepo.findOne({ where: { periodId, studentId, subjectId } });
        const autoAverage = avg === null ? null : avg.toFixed(2);
        const finalValue = row?.manualOverride ?? (avg === null ? 0 : Math.round(avg));
        if (row) {
          row.autoAverage = autoAverage;
          row.finalValue = finalValue;
        } else {
          row = this.periodGradesRepo.create({ periodId, studentId, subjectId, autoAverage, finalValue });
        }
        return this.periodGradesRepo.save(row);
      }),
    );
  }

  async overridePeriodGrade(id: string, manualOverride: number): Promise<PeriodGrade> {
    const row = await this.periodGradesRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Period grade not found');
    row.manualOverride = manualOverride;
    row.finalValue = manualOverride;
    return this.periodGradesRepo.save(row);
  }

  periodGradesForStudent(periodId: string, studentId: string): Promise<PeriodGrade[]> {
    return this.periodGradesRepo.find({ where: { periodId, studentId } });
  }

  periodGradesForClass(periodId: string, groupId: string, studentIds: string[]): Promise<PeriodGrade[]> {
    if (studentIds.length === 0) return Promise.resolve([]);
    return this.periodGradesRepo
      .createQueryBuilder('pg')
      .where('pg.periodId = :periodId', { periodId })
      .andWhere('pg.studentId IN (:...studentIds)', { studentIds })
      .getMany();
  }

  createExam(periodId: string, dto: CreateExamDto): Promise<Exam> {
    return this.examsRepo.save(this.examsRepo.create({ ...dto, periodId }));
  }

  examsForPeriod(periodId: string, groupId?: string): Promise<Exam[]> {
    return this.examsRepo.find({ where: groupId ? { periodId, groupId } : { periodId } });
  }

  async setExamResults(examId: string, dto: SetExamResultsDto): Promise<ExamResult[]> {
    const exam = await this.examsRepo.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');
    return Promise.all(
      dto.results.map(async (r) => {
        const existing = await this.examResultsRepo.findOne({ where: { examId, studentId: r.studentId } });
        if (existing) {
          existing.score = r.score;
          return this.examResultsRepo.save(existing);
        }
        return this.examResultsRepo.save(this.examResultsRepo.create({ examId, studentId: r.studentId, score: r.score }));
      }),
    );
  }

  examResults(examId: string): Promise<ExamResult[]> {
    return this.examResultsRepo.find({ where: { examId } });
  }

  examResultsForStudent(studentId: string, periodId?: string): Promise<Array<ExamResult & { exam: Exam }>> {
    const qb = this.examResultsRepo
      .createQueryBuilder('r')
      .innerJoinAndMapOne('r.exam', Exam, 'e', 'e.id = r.examId')
      .where('r.studentId = :studentId', { studentId });
    if (periodId) qb.andWhere('e.periodId = :periodId', { periodId });
    return qb.getMany() as unknown as Promise<Array<ExamResult & { exam: Exam }>>;
  }
}
