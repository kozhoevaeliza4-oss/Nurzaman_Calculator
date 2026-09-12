import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 16: справочник предметов (общий для всех классов Школы).
@Entity('subjects')
export class Subject extends BaseEntity {
  @Index({ unique: true })
  @Column()
  name: string;
}
