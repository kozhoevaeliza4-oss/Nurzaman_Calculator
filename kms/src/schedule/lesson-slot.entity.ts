import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 18: расписание уроков - one recurring weekly slot per row.
@Entity('lesson_slots')
@Index(['groupId', 'dayOfWeek', 'lessonNumber'], { unique: true })
export class LessonSlot extends BaseEntity {
  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  // ISO: 1 = Monday .. 7 = Sunday.
  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek: number;

  @Column({ name: 'lesson_number', type: 'int' })
  lessonNumber: number;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ type: 'varchar', nullable: true })
  room: string | null;
}
