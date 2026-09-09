import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Child } from '../children/child.entity';
import { Parent } from './parent.entity';

export enum RelationType {
  MOTHER = 'mother',
  FATHER = 'father',
  GUARDIAN = 'guardian',
  OTHER = 'other',
}

// Module 2: "Привязка нескольких представителей к одному ребёнку
// (мать/отец/опекун) с раздельным доступом."
@Entity('child_parents')
@Index(['childId', 'parentId'], { unique: true })
export class ChildParent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @ManyToOne(() => Child, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: Child;

  @Index()
  @Column({ name: 'parent_id', type: 'uuid' })
  parentId: string;

  @ManyToOne(() => Parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @Column({ name: 'relation_type', type: 'enum', enum: RelationType })
  relationType: RelationType;
}
