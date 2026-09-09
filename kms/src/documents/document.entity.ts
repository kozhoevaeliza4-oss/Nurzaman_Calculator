import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum DocumentType {
  BIRTH_CERTIFICATE = 'birth_certificate',
  MEDICAL_CLEARANCE = 'medical_clearance',
  CONTRACT = 'contract',
  OTHER = 'other',
}

// Module 1: "Хранение документов (свидетельство о рождении, мед. допуск и т.п.)."
@Entity('documents')
export class ChildDocument extends BaseEntity {
  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  // Opaque key into the configured StorageAdapter — never a public URL.
  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;
}
