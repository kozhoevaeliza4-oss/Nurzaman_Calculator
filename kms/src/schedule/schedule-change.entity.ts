import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 18: "Изменения в расписании (замены) с уведомлением." A one-off
// override of a LessonSlot for a specific date - substitute teacher/room,
// or a cancellation.
@Entity('schedule_changes')
export class ScheduleChange extends BaseEntity {
  @Index()
  @Column({ name: 'lesson_slot_id', type: 'uuid' })
  lessonSlotId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'new_teacher_id', type: 'uuid', nullable: true })
  newTeacherId: string | null;

  @Column({ name: 'new_room', type: 'varchar', nullable: true })
  newRoom: string | null;

  @Column({ default: false })
  cancelled: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;
}
