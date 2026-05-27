import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../common/llm/llm.module';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Document } from './entities/document.entity';
import { ProjectWbs } from './entities/project-wbs.entity';
import { WbsItem } from './entities/wbs-item.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { MeetingChecklist } from '../meetings/entities/meeting-checklist.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { DocumentsService } from './documents.service';
import { WbsService } from './wbs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      Document,
      ProjectWbs,
      WbsItem,
      Meeting,
      MeetingChecklist,
    ]),
    AuthModule,
    LlmModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, DocumentsService, WbsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
