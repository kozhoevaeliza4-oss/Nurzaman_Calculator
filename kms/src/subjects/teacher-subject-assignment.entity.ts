import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 16: назначение учителя-предметника на предмет и класс. A subject
// teacher's grading/homework access (modules 17/19) is scoped to exactly
// the (groupId, subjectId) pairs they're assigned here.
@Entity('teacher_subject_assignments')
@Index(['teacherId', 'groupId', 'subjectId'], { unique: true })
export class TeacherSubjectAssignment extends BaseEntity {
  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;
}
