import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 19: домашние задания.
@Entity('homework')
export class Homework extends BaseEntity {
  @Index()
  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'text' })
  description: string;
}
