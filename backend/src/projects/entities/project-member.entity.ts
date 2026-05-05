import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';

export enum MemberRole {
  PM = 'PM',
  DEVELOPER = 'DEVELOPER',
  DESIGNER = 'DESIGNER',
  QA = 'QA',
  DEVOPS = 'DEVOPS',
  OTHER = 'OTHER',
}

@Entity('project_members')
@Unique(['projectId', 'userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.OTHER })
  role: MemberRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
