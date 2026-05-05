import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ActionItem } from '../action-items/entities/action-item.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectMember, Meeting, ActionItem]),
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
