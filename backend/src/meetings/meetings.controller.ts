import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { MeetingStatus } from './entities/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CreateMeetingsFromRecommendationsDto } from './dto/create-meetings-from-recommendations.dto';
import { UpdateChecklistsDto } from './dto/update-checklists.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get(':meetingId')
  findOne(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.findOne(user.id, meetingId);
  }

  @Patch(':meetingId')
  update(
    @CurrentUser() user: User,
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.meetingsService.update(user.id, meetingId, dto);
  }

  @Delete(':meetingId')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.remove(user.id, meetingId);
  }

  @Get(':meetingId/checklists')
  getChecklists(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.getChecklists(user.id, meetingId);
  }

  @Patch(':meetingId/checklists')
  updateChecklists(
    @CurrentUser() user: User,
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateChecklistsDto,
  ) {
    return this.meetingsService.updateChecklists(user.id, meetingId, dto);
  }

  @Get(':meetingId/briefing')
  getBriefing(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.getBriefing(user.id, meetingId);
  }

  // STT 기능 보류 — 회의록 직접 업로드(/minutes)로 대체됨. 추후 재사용 위해 주석 보존.
  // @Post(':meetingId/stt')
  // @UseInterceptors(FileInterceptor('audio'))
  // uploadStt(
  //   @CurrentUser() user: User,
  //   @Param('meetingId') meetingId: string,
  //   @UploadedFile() _file: any,
  // ) {
  //   return this.meetingsService.uploadStt(user.id, meetingId);
  // }

  // @Get(':meetingId/transcript')
  // getTranscript(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
  //   return this.meetingsService.getTranscript(user.id, meetingId);
  // }

  @Post(':meetingId/minutes')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadMinutes(
    @CurrentUser() user: User,
    @Param('meetingId') meetingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.meetingsService.uploadMinutes(user.id, meetingId, file);
  }

  @Get(':meetingId/minutes')
  async downloadMinutes(
    @CurrentUser() user: User,
    @Param('meetingId') meetingId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileName, mimeType, content } = await this.meetingsService.downloadMinutes(
      user.id,
      meetingId,
    );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    });
    return new StreamableFile(content);
  }

  @Post(':meetingId/completion')
  @HttpCode(200)
  completeMeeting(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.completeMeeting(user.id, meetingId);
  }

  @Post(':meetingId/reopen')
  @HttpCode(200)
  reopenMeeting(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.reopenMeeting(user.id, meetingId);
  }

  @Get(':meetingId/metrics')
  getMetrics(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.getMetrics(user.id, meetingId);
  }
}

@Controller('projects/:projectId/meetings')
@UseGuards(JwtAuthGuard)
export class ProjectMeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Query('status') status?: MeetingStatus,
  ) {
    return this.meetingsService.findProjectMeetings(user.id, projectId, status);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.meetingsService.createMeeting(user.id, projectId, dto);
  }

  @Post('from-recommendations')
  createFromRecommendations(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: CreateMeetingsFromRecommendationsDto,
  ) {
    return this.meetingsService.createFromRecommendations(user.id, projectId, dto.meetings);
  }
}
