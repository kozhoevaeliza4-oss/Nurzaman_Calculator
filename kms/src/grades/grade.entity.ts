import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 17: электронный дневник. One row per grade a subject teacher
// gives a student for a subject on a given date/lesson.
@Entity('grades')
export class Grade extends BaseEntity {
  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Index()
  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Index()
  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ type: 'date' })
  date: string;

  // 1-10 scale (common across CIS school systems, including 5- and
  // 10-point grading) - stored as an int, the school configures its own
  // meaning.
  @Column({ type: 'int' })
  value: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;
}
