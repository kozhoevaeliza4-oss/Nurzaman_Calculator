import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum LessonAttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
}

// Module 5/17 (open question, resolved): Школа fixes attendance per lesson,
// not per day - needed for a correct diary (прогулы по предметам).
@Entity('lesson_attendance')
@Index(['lessonSlotId', 'studentId', 'date'], { unique: true })
export class LessonAttendance extends BaseEntity {
  @Column({ name: 'lesson_slot_id', type: 'uuid' })
  lessonSlotId: string;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: LessonAttendanceStatus })
  status: LessonAttendanceStatus;

  @Column({ name: 'marked_by', type: 'uuid' })
  markedBy: string;
}
