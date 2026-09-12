import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('exam_results')
@Index(['examId', 'studentId'], { unique: true })
export class ExamResult extends BaseEntity {
  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'int' })
  score: number;
}
