import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { MemberRole } from '../projects/entities/project-member.entity';
import { ActionItemsService } from '../action-items/action-items.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateChecklistsDto } from './dto/update-checklists.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingChecklist } from './entities/meeting-checklist.entity';
import { Meeting, MeetingStatus, MeetingType, SttStatus } from './entities/meeting.entity';

const DEFAULT_CHECKLISTS: Record<MeetingType, string[]> = {
  [MeetingType.KICKOFF]: [
    '프로젝트 목표 및 범위 공유',
    '팀원 역할 및 책임 명확화',
    '일정 및 마일스톤 확인',
    '커뮤니케이션 채널 결정',
    'WBS 검토 및 승인',
  ],
  [MeetingType.PROGRESS_CHECK]: [
    '지난 기간 진행 상황 보고',
    '현재 진행 중인 작업 현황',
    '미완료 Action Item 점검',
    '일정 지연 이슈 확인',
    '다음 기간 계획 수립',
  ],
  [MeetingType.ISSUE_CHECK]: [
    '이슈 현황 보고',
    '이슈 원인 분석',
    '해결 방안 논의',
    '담당자 및 기한 결정',
    '에스컬레이션 필요 여부 확인',
  ],
  [MeetingType.CONSENSUS]: [
    '의사결정 배경 및 목적 공유',
    '관련 데이터 및 근거 검토',
    '대안 비교 분석',
    '최종 결정 도출',
    '후속 조치 계획 수립',
  ],
};

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingChecklist)
    private readonly checklistRepo: Repository<MeetingChecklist>,
    private readonly projectsService: ProjectsService,
    private readonly actionItemsService: ActionItemsService,
  ) {}

  async createMeeting(userId: string, projectId: string, dto: CreateMeetingDto): Promise<Meeting> {
    await this.projectsService.findOne(userId, projectId);

    const meeting = this.meetingRepo.create({
      projectId,
      createdById: userId,
      title: dto.title,
      type: dto.type,
      scheduledAt: new Date(dto.scheduledAt),
    });
    const saved = await this.meetingRepo.save(meeting);

    const checklists = DEFAULT_CHECKLISTS[dto.type].map((content, index) =>
      this.checklistRepo.create({ meetingId: saved.id, content, order: index }),
    );
    await this.checklistRepo.save(checklists);

    return this.findOne(userId, saved.id);
  }

  async createFromRecommendations(
    userId: string,
    projectId: string,
    dtos: CreateMeetingDto[],
  ): Promise<Meeting[]> {
    await this.projectsService.findOne(userId, projectId);

    const created: Meeting[] = [];
    for (const dto of dtos) {
      created.push(await this.createMeeting(userId, projectId, dto));
    }
    return created;
  }

  async findProjectMeetings(
    userId: string,
    projectId: string,
    status?: MeetingStatus,
  ): Promise<Meeting[]> {
    await this.projectsService.findOne(userId, projectId);

    const where: any = { projectId };
    if (status) where.status = status;

    return this.meetingRepo.find({
      where,
      relations: ['checklists', 'createdBy'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async findOne(userId: string, meetingId: string): Promise<Meeting> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['checklists', 'createdBy'],
    });
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다.');

    await this.projectsService.findOne(userId, meeting.projectId);
    return meeting;
  }

  async update(userId: string, meetingId: string, dto: UpdateMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(userId, meetingId);
    this.assertScheduled(meeting);
    await this.assertPm(userId, meeting.projectId);

    if (dto.title) meeting.title = dto.title;
    if (dto.scheduledAt) meeting.scheduledAt = new Date(dto.scheduledAt);
    await this.meetingRepo.save(meeting);

    return this.findOne(userId, meetingId);
  }

  async remove(userId: string, meetingId: string): Promise<void> {
    const meeting = await this.findOne(userId, meetingId);
    this.assertScheduled(meeting);
    await this.assertPm(userId, meeting.projectId);
    await this.meetingRepo.remove(meeting);
  }

  async getChecklists(userId: string, meetingId: string): Promise<MeetingChecklist[]> {
    const meeting = await this.findOne(userId, meetingId);
    return this.checklistRepo.find({
      where: { meetingId: meeting.id },
      order: { order: 'ASC' },
    });
  }

  async updateChecklists(
    userId: string,
    meetingId: string,
    dto: UpdateChecklistsDto,
  ): Promise<MeetingChecklist[]> {
    const meeting = await this.findOne(userId, meetingId);

    await this.checklistRepo.delete({ meetingId: meeting.id });

    const checklists = dto.items.map((item, index) =>
      this.checklistRepo.create({
        meetingId: meeting.id,
        content: item.content,
        isDone: item.isDone ?? false,
        order: item.order ?? index,
      }),
    );
    return this.checklistRepo.save(checklists);
  }

  async getBriefing(userId: string, meetingId: string): Promise<object> {
    const meeting = await this.findOne(userId, meetingId);

    const previousMeeting = await this.meetingRepo.findOne({
      where: {
        projectId: meeting.projectId,
        status: MeetingStatus.COMPLETED,
        scheduledAt: LessThan(meeting.scheduledAt),
      },
      relations: ['checklists'],
      order: { scheduledAt: 'DESC' },
    });

    return {
      currentMeeting: { id: meeting.id, title: meeting.title, type: meeting.type },
      previousMeeting: previousMeeting
        ? {
            id: previousMeeting.id,
            title: previousMeeting.title,
            scheduledAt: previousMeeting.scheduledAt,
            summary: previousMeeting.summary,
            achievementRate: previousMeeting.achievementRate,
            unfinishedChecklists: previousMeeting.checklists.filter((c) => !c.isDone),
          }
        : null,
      carriedOverItems: await this.actionItemsService.findCarriedOver(meeting.projectId),
    };
  }

  async uploadStt(userId: string, meetingId: string): Promise<Meeting> {
    const meeting = await this.findOne(userId, meetingId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('완료된 회의에는 녹음 파일을 업로드할 수 없습니다.');
    }

    meeting.sttStatus = SttStatus.PENDING;
    if (meeting.status === MeetingStatus.SCHEDULED) {
      meeting.status = MeetingStatus.IN_PROGRESS;
    }
    return this.meetingRepo.save(meeting);
  }

  async getTranscript(userId: string, meetingId: string): Promise<{ transcript: string }> {
    const meeting = await this.findOne(userId, meetingId);

    if (meeting.sttStatus !== SttStatus.COMPLETED) {
      throw new BadRequestException('STT 변환이 완료되지 않았습니다.');
    }
    return { transcript: meeting.transcript };
  }

  async completeMeeting(userId: string, meetingId: string): Promise<Meeting> {
    const meeting = await this.findOne(userId, meetingId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('이미 완료된 회의입니다.');
    }
    await this.assertPm(userId, meeting.projectId);

    const checklists = await this.checklistRepo.find({ where: { meetingId: meeting.id } });
    const total = checklists.length;
    const done = checklists.filter((c) => c.isDone).length;

    meeting.status = MeetingStatus.COMPLETED;
    meeting.completedAt = new Date();
    meeting.achievementRate = total > 0 ? Math.round((done / total) * 100) : 0;

    const saved = await this.meetingRepo.save(meeting);

    // 이전 미결 항목 이월 → 이번 회의의 미완료 체크리스트를 새 Action Item으로 생성
    await this.actionItemsService.markCarriedOver(meeting.projectId);
    const uncheckedTitles = checklists.filter((c) => !c.isDone).map((c) => c.content);
    await this.actionItemsService.createFromChecklists(
      meeting.projectId,
      meeting.id,
      userId,
      uncheckedTitles,
    );

    return saved;
  }

  async getMetrics(userId: string, meetingId: string): Promise<object> {
    const meeting = await this.findOne(userId, meetingId);

    if (meeting.status !== MeetingStatus.COMPLETED) {
      throw new BadRequestException('완료된 회의만 지표를 조회할 수 있습니다.');
    }

    const checklists = await this.checklistRepo.find({
      where: { meetingId: meeting.id },
      order: { order: 'ASC' },
    });

    return {
      meetingId: meeting.id,
      title: meeting.title,
      type: meeting.type,
      scheduledAt: meeting.scheduledAt,
      completedAt: meeting.completedAt,
      summary: meeting.summary,
      achievementRate: meeting.achievementRate,
      checklists,
      transcript: meeting.transcript,
    };
  }

  private assertScheduled(meeting: Meeting): void {
    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException('예정된 회의만 수정/삭제할 수 있습니다.');
    }
  }

  private async assertPm(userId: string, projectId: string): Promise<void> {
    const project = await this.projectsService.findOne(userId, projectId);
    const isPm = project.members?.some(
      (m) => m.userId === userId && m.role === MemberRole.PM,
    );
    if (!isPm) throw new ForbiddenException('PM 권한이 필요합니다.');
  }
}
