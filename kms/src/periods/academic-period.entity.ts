import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

// Module 20: учебные периоды (четверти/триместры/учебный год).
@Entity('academic_periods')
export class AcademicPeriod extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'academic_year' })
  academicYear: string;
}
