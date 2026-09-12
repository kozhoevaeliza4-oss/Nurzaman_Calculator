import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Direction } from '../common/direction.enum';

// ТЗ v3.0 раздел 1.2: "группа" (Кидс) и "класс" (Школа) - один и тот же
// объект на уровне логики (структурная единица + закреплённый педагог),
// различается только название в интерфейсе по direction. `parallel`/
// `letter` are only meaningful for Школа (e.g. параллель 5, литера "А").
@Entity('groups')
export class Group extends BaseEntity {
  @Column()
  name: string;

  @Column()
  capacity: number;

  // Staff user id of the assigned teacher/homeroom teacher (module 1:
  // "закрепление воспитателя" / "классный руководитель").
  @Column({ name: 'teacher_id', type: 'uuid', nullable: true })
  teacherId: string | null;

  @Column({ type: 'enum', enum: Direction, default: Direction.KIDS })
  direction: Direction;

  @Column({ type: 'int', nullable: true })
  parallel: number | null;

  @Column({ type: 'varchar', nullable: true })
  letter: string | null;
}
