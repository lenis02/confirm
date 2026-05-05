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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { MeetingStatus } from './entities/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
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

  @Post(':meetingId/stt')
  @UseInterceptors(FileInterceptor('audio'))
  uploadStt(
    @CurrentUser() user: User,
    @Param('meetingId') meetingId: string,
    @UploadedFile() _file: any,
  ) {
    return this.meetingsService.uploadStt(user.id, meetingId);
  }

  @Get(':meetingId/transcript')
  getTranscript(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.getTranscript(user.id, meetingId);
  }

  @Post(':meetingId/completion')
  @HttpCode(200)
  completeMeeting(@CurrentUser() user: User, @Param('meetingId') meetingId: string) {
    return this.meetingsService.completeMeeting(user.id, meetingId);
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
}
