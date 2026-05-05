import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { MeetingChecklist } from './meeting-checklist.entity';

export enum MeetingType {
  KICKOFF = 'KICKOFF',
  PROGRESS_CHECK = 'PROGRESS_CHECK',
  ISSUE_CHECK = 'ISSUE_CHECK',
  CONSENSUS = 'CONSENSUS',
}

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum SttStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: MeetingType })
  type: MeetingType;

  @Column({ type: 'enum', enum: MeetingStatus, default: MeetingStatus.SCHEDULED })
  status: MeetingStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ nullable: true, type: 'text' })
  summary: string;

  @Column({ name: 'achievement_rate', type: 'float', nullable: true })
  achievementRate: number;

  @Column({ name: 'stt_status', type: 'enum', enum: SttStatus, nullable: true })
  sttStatus: SttStatus;

  @Column({ nullable: true, type: 'text' })
  transcript: string;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => MeetingChecklist, (c) => c.meeting, { cascade: true })
  checklists: MeetingChecklist[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
