import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 16: учебный план класса — привязка предмета к классу (Group с
// direction=school).
@Entity('class_subjects')
@Index(['groupId', 'subjectId'], { unique: true })
export class ClassSubject extends BaseEntity {
  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;
}
