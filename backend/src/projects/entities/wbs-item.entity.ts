import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectWbs } from './project-wbs.entity';

@Entity('wbs_items')
export class WbsItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wbs_id' })
  wbsId: string;

  @ManyToOne(() => ProjectWbs, (wbs) => wbs.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wbs_id' })
  wbs: ProjectWbs;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ type: 'int' })
  order: number;

  @Column()
  phase: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @Column({ nullable: true })
  complexity: string;

  @Column({ type: 'simple-array', nullable: true })
  dependencies: string[];

  @Column({ name: 'assigned_role' })
  assignedRole: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ type: 'text', nullable: true })
  reasoning: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'is_decision_point', default: false })
  isDecisionPoint: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
