import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum SyncDirection {
  EXPORT = 'export',
  IMPORT = 'import',
}

// Module 4: audit trail for every 1C exchange, regardless of the exact
// protocol eventually used (see README — the exact 1C version/config is
// still an open TZ question).
@Entity('one_c_sync_logs')
export class SyncLog extends BaseEntity {
  @Column({ type: 'enum', enum: SyncDirection })
  direction: SyncDirection;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'record_count' })
  recordCount: number;
}
