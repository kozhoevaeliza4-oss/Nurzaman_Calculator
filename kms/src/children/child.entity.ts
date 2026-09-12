import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Group } from '../groups/group.entity';
import { Direction } from '../common/direction.enum';

export enum ChildStatus {
  ACTIVE = 'active',
  LEFT = 'left',
  ACADEMIC_LEAVE = 'academic_leave',
}

export enum ContractStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('children')
export class Child extends BaseEntity {
  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Index()
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => Group, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;

  @Column({ name: 'photo_url', type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ name: 'enrollment_date', type: 'date' })
  enrollmentDate: string;

  @Index()
  @Column({ type: 'enum', enum: ChildStatus, default: ChildStatus.ACTIVE })
  status: ChildStatus;

  @Column({ name: 'contract_status', type: 'enum', enum: ContractStatus, nullable: true })
  contractStatus: ContractStatus | null;

  // Module 15 hook: allergies/dietary restrictions, visible to teacher and kitchen.
  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  allergies: string[];

  // Module 5: "Уникальный QR/штрих-код на каждого ребёнка." An opaque
  // random token, not the child's id, so a printed badge can't be used to
  // enumerate/guess other children's ids.
  @Index({ unique: true })
  @Column({ name: 'qr_code' })
  qrCode: string;

  // ТЗ v3.0 раздел 1.2: направление, к которому относится карточка -
  // "ребёнок" (kids) или "ученик" (school). Данные между направлениями
  // не смешиваются.
  @Index()
  @Column({ type: 'enum', enum: Direction, default: Direction.KIDS })
  direction: Direction;

  // Резерв на будущее (открытый вопрос ТЗ v3.0 раздел 1.2): необязательная
  // связь с карточкой того же человека в другом направлении, если/когда
  // появится процесс перевода Кидс -> Школа. Сам перевод не реализован -
  // это только поле в модели данных, чтобы не мигрировать данные задним
  // числом.
  @Column({ name: 'linked_record_id', type: 'uuid', nullable: true })
  linkedRecordId: string | null;
}
