import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('groups')
export class Group extends BaseEntity {
  @Column()
  name: string;

  @Column()
  capacity: number;

  // Staff user id of the assigned teacher (module 1: "закрепление воспитателя").
  @Column({ name: 'teacher_id', type: 'uuid', nullable: true })
  teacherId: string | null;
}
