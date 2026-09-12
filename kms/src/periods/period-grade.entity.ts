import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 20: "Итоговые оценки за период — автоматический расчёт на основе
// текущих оценок с возможностью ручной корректировки." `finalValue` is
// what the transcript shows: manualOverride if set, else autoAverage
// rounded to the nearest integer.
@Entity('period_grades')
@Index(['periodId', 'studentId', 'subjectId'], { unique: true })
export class PeriodGrade extends BaseEntity {
  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'auto_average', type: 'numeric', precision: 4, scale: 2, nullable: true })
  autoAverage: string | null;

  @Column({ name: 'manual_override', type: 'int', nullable: true })
  manualOverride: number | null;

  @Column({ name: 'final_value', type: 'int' })
  finalValue: number;
}
