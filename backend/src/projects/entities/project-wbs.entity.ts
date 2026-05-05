import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';
import { WbsItem } from './wbs-item.entity';

export enum WbsStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

@Entity('project_wbs')
export class ProjectWbs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', unique: true })
  projectId: string;

  @OneToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'document_id', nullable: true })
  documentId: string;

  @ManyToOne(() => Document, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'project_summary', type: 'text', nullable: true })
  projectSummary: string;

  @Column({ name: 'total_duration', nullable: true })
  totalDuration: string;

  @Column({ name: 'team_resources', type: 'jsonb', nullable: true })
  teamResources: { department: string; role: string; experience_level: string }[];

  @Column({ type: 'enum', enum: WbsStatus, default: WbsStatus.DRAFT })
  status: WbsStatus;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date;

  @Column({ name: 'confirmed_by_id', nullable: true })
  confirmedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confirmed_by_id' })
  confirmedBy: User;

  @OneToMany(() => WbsItem, (item) => item.wbs, { cascade: true })
  items: WbsItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
