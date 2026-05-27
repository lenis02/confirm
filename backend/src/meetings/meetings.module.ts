import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { ActionItemsModule } from '../action-items/action-items.module';
import { GoogleCalendarModule } from '../common/google/google-calendar.module';
import { User } from '../users/entities/user.entity';
import { MeetingChecklist } from './entities/meeting-checklist.entity';
import { Meeting } from './entities/meeting.entity';
import { MeetingsController, ProjectMeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingChecklist, User]),
    AuthModule,
    ProjectsModule,
    ActionItemsModule,
    GoogleCalendarModule,
  ],
  controllers: [MeetingsController, ProjectMeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
