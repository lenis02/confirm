import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity('meeting_checklists')
export class MeetingChecklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @ManyToOne(() => Meeting, (m) => m.checklists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_done', default: false })
  isDone: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
