import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 20: экзамены/итоговое тестирование.
@Entity('exams')
export class Exam extends BaseEntity {
  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'max_score', type: 'int' })
  maxScore: number;
}
