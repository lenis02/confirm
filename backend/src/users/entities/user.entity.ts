import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserIntegration } from './user-integration.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'job_title', nullable: true })
  jobTitle: string;

  @Column()
  provider: string;

  @Column({ name: 'provider_id', unique: true })
  providerId: string;

  // 구글 캘린더 연동용 리프레시 토큰 (AES-256 암호화 후 저장)
  @Column({ name: 'google_refresh_token', type: 'text', nullable: true })
  googleRefreshToken: string | null;

  @OneToMany(() => UserIntegration, (integration) => integration.user)
  integrations: UserIntegration[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
