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

  // 회의가 연관된 부서(WBS assignedRole) 목록. 캘린더 색상 표시에 사용
  @Column({ type: 'jsonb', nullable: true })
  departments: string[] | null;

  @Column({ type: 'enum', enum: MeetingStatus, default: MeetingStatus.SCHEDULED })
  status: MeetingStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ nullable: true, type: 'text' })
  summary: string;

  @Column({ name: 'achievement_rate', type: 'float', nullable: true })
  achievementRate: number | null;

  @Column({ name: 'stt_status', type: 'enum', enum: SttStatus, nullable: true })
  sttStatus: SttStatus;

  @Column({ nullable: true, type: 'text' })
  transcript: string;

  // 업로드된 회의록 파일 (hwp/doc/docx/pdf) — 배포 환경 디스크가 휘발성이라 DB(bytea)에 보관
  @Column({ name: 'minutes_file_name', type: 'varchar', nullable: true })
  minutesFileName: string | null;

  @Column({ name: 'minutes_mime_type', type: 'varchar', nullable: true })
  minutesMimeType: string | null;

  @Column({ name: 'minutes_file_size', type: 'int', nullable: true })
  minutesFileSize: number | null;

  // 본문 바이트는 평소 조회에 불필요하므로 select:false (다운로드 시에만 명시적으로 로드)
  @Column({ name: 'minutes_content', type: 'bytea', nullable: true, select: false })
  minutesContent: Buffer | null;

  // 연동된 구글 캘린더 이벤트 ID (수정/삭제 동기화용)
  @Column({ name: 'google_event_id', type: 'varchar', nullable: true })
  googleEventId: string | null;

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
