import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 19: "Отметка о выполнении (опционально — прикрепление файла)."
// The file-attachment part isn't wired up in this pass - `note` covers the
// simple "done" mark a parent/student can leave.
@Entity('homework_submissions')
@Index(['homeworkId', 'studentId'], { unique: true })
export class HomeworkSubmission extends BaseEntity {
  @Column({ name: 'homework_id', type: 'uuid' })
  homeworkId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ default: false })
  done: boolean;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
