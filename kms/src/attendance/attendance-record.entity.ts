import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum AttendanceEventType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

// Module 5: "Фиксация точного времени прихода/ухода" via QR scan by a
// teacher or a parent.
@Entity('attendance_records')
export class AttendanceRecord extends BaseEntity {
  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ name: 'event_type', type: 'enum', enum: AttendanceEventType })
  eventType: AttendanceEventType;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  // Staff or parent user id that performed the scan.
  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy: string | null;

  @Column({ name: 'recorded_by_role', type: 'varchar', nullable: true })
  recordedByRole: string | null;
}
