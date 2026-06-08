import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectsService } from './projects.service';
import { MemberRole } from './entities/project-member.entity';
import { ProjectWbs, WbsStatus } from './entities/project-wbs.entity';
import { WbsItem } from './entities/wbs-item.entity';
import { Document } from './entities/document.entity';
import { LlmService } from '../common/llm/llm.service';
import { Meeting, MeetingType } from '../meetings/entities/meeting.entity';
import { MeetingChecklist } from '../meetings/entities/meeting-checklist.entity';

// 킥오프 회의 기본 체크리스트 (meetings.service의 KICKOFF 템플릿과 동일)
const KICKOFF_CHECKLIST = [
  '프로젝트 목표 및 범위 공유',
  '팀원 역할 및 책임 명확화',
  '일정 및 마일스톤 확인',
  '커뮤니케이션 채널 결정',
  'WBS 검토 및 승인',
];

export class UpdateWbsItemDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() assignedRole?: string;
  @IsOptional() @IsNumber() durationDays?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsBoolean() isDecisionPoint?: boolean;
}

export class TeamResourceDto {
  @IsString() department: string;
  @IsString() role: string;
  @IsOptional() @IsString() experience_level?: string;
}

export class UpdateTeamResourcesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamResourceDto)
  teamResources: TeamResourceDto[];
}

@Injectable()
export class WbsService {
  private readonly logger = new Logger(WbsService.name);

  constructor(
    @InjectRepository(ProjectWbs)
    private readonly wbsRepo: Repository<ProjectWbs>,
    @InjectRepository(WbsItem)
    private readonly itemRepo: Repository<WbsItem>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingChecklist)
    private readonly checklistRepo: Repository<MeetingChecklist>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
  ) {}

  async generateFromDocument(
    projectId: string,
    documentId: string,
    documentText: string,
    createdById: string,
  ): Promise<ProjectWbs> {
    const result = await this.llmService.generateWbs(documentText);

    // LLM 호출(수 분 소요) 중 문서가 삭제(분석 취소)됐을 수 있어 저장 직전 재확인.
    // 삭제됐다면 document_id FK 위반을 막기 위해 링크를 비운 채로 WBS를 저장한다.
    const documentExists = await this.documentRepo.existsBy({ id: documentId });
    if (!documentExists) {
      this.logger.warn(`문서(${documentId})가 처리 중 삭제됨 — WBS는 문서 링크 없이 저장합니다.`);
    }

    // 기존 WBS 덮어쓰기
    const existing = await this.wbsRepo.findOne({ where: { projectId } });
    if (existing) await this.wbsRepo.remove(existing);

    const wbs = this.wbsRepo.create({
      projectId,
      documentId: documentExists ? documentId : undefined,
      projectSummary: result.project_context.background_and_goals,
      totalDuration: result.project_context.total_duration,
      teamResources: result.project_context.team_resources,
      status: WbsStatus.DRAFT,
    });
    const savedWbs = await this.wbsRepo.save(wbs);

    const items: WbsItem[] = result.wbs_tasks.map((raw, index) => {
      const item = new WbsItem();
      item.wbsId = savedWbs.id;
      item.projectId = projectId;
      item.order = index + 1;
      item.taskId = raw.task_id;
      item.title = raw.task_name;
      item.phase = raw.department;
      item.assignedRole = raw.department;
      item.complexity = raw.complexity;
      item.durationDays = raw.duration_days;
      item.startDate = raw.start_date && !raw.start_date.startsWith('D+') ? new Date(raw.start_date) : null;
      item.endDate = raw.end_date && !raw.end_date.startsWith('D+') ? new Date(raw.end_date) : null;
      item.dependencies = raw.dependencies ?? [];
      item.reasoning = raw.reasoning;
      item.isDecisionPoint = false;
      return item;
    });
    await this.itemRepo.save(items);

    // WBS 생성 직후 킥오프 회의 자동 생성 (실패해도 WBS 결과는 반환)
    try {
      await this.createKickoffMeeting(projectId, items, createdById);
    } catch (err) {
      this.logger.warn('킥오프 회의 자동 생성 실패', err as Error);
    }

    return this.findWbs(projectId);
  }

  private async createKickoffMeeting(
    projectId: string,
    items: WbsItem[],
    createdById: string,
  ): Promise<void> {
    // 이미 킥오프가 있으면 (문서 재업로드 등) 중복 생성 방지
    const exists = await this.meetingRepo.findOne({
      where: { projectId, type: MeetingType.KICKOFF },
    });
    if (exists) return;

    // 가장 이른 태스크 시작일을 킥오프 일정으로, 없으면 오늘
    const startTimes = items
      .map((i) => i.startDate)
      .filter((d): d is Date => !!d)
      .map((d) => new Date(d).getTime());
    const scheduledAt = startTimes.length ? new Date(Math.min(...startTimes)) : new Date();

    const meeting = this.meetingRepo.create({
      projectId,
      createdById,
      title: '킥오프 회의',
      type: MeetingType.KICKOFF,
      scheduledAt,
    });
    const saved = await this.meetingRepo.save(meeting);

    const checklists = KICKOFF_CHECKLIST.map((content, order) =>
      this.checklistRepo.create({ meetingId: saved.id, content, order }),
    );
    await this.checklistRepo.save(checklists);
  }

  async findWbs(projectId: string, userId?: string): Promise<ProjectWbs> {
    if (userId) await this.projectsService.findOne(userId, projectId);

    const wbs = await this.wbsRepo.findOne({
      where: { projectId },
      relations: ['items'],
      order: { items: { order: 'ASC' } },
    });
    if (!wbs) throw new NotFoundException('WBS가 존재하지 않습니다. 문서를 먼저 업로드하세요.');
    return wbs;
  }

  async confirmWbs(userId: string, projectId: string): Promise<ProjectWbs> {
    await this.assertPm(userId, projectId);
    const wbs = await this.findWbs(projectId);

    if (wbs.status === WbsStatus.CONFIRMED) {
      throw new BadRequestException('이미 확정된 WBS입니다.');
    }

    wbs.status = WbsStatus.CONFIRMED;
    wbs.confirmedAt = new Date();
    wbs.confirmedById = userId;
    await this.wbsRepo.save(wbs);

    return this.findWbs(projectId);
  }

  // 사업계획서에서 AI가 인식한 팀 구성(부서·역할·경력)을 PM이 확인·수정
  async updateTeamResources(
    userId: string,
    projectId: string,
    resources: TeamResourceDto[],
  ): Promise<ProjectWbs> {
    await this.assertPm(userId, projectId);
    const wbs = await this.findWbs(projectId);

    wbs.teamResources = resources.map((r) => ({
      department: r.department,
      role: r.role,
      experience_level: r.experience_level ?? '',
    }));
    await this.wbsRepo.save(wbs);

    return this.findWbs(projectId);
  }

  async updateItem(
    userId: string,
    projectId: string,
    milestoneId: string,
    dto: UpdateWbsItemDto,
  ): Promise<WbsItem> {
    await this.assertPm(userId, projectId);

    const item = await this.itemRepo.findOne({ where: { id: milestoneId, projectId } });
    if (!item) throw new NotFoundException('WBS 항목을 찾을 수 없습니다.');

    Object.assign(item, {
      ...(dto.title && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.assignedRole && { assignedRole: dto.assignedRole }),
      ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      ...(dto.isDecisionPoint !== undefined && { isDecisionPoint: dto.isDecisionPoint }),
    });

    return this.itemRepo.save(item);
  }

  async deleteItem(userId: string, projectId: string, itemId: string): Promise<void> {
    await this.assertPm(userId, projectId);

    const item = await this.itemRepo.findOne({ where: { id: itemId, projectId } });
    if (!item) throw new NotFoundException('WBS 항목을 찾을 수 없습니다.');

    await this.itemRepo.remove(item);
    await this.resequenceItems(projectId);
  }

  // 삭제 후 남은 항목의 순번(order)·표시 ID(taskId)를 1부터 연속되게 재부여 (빈 ID 방지)
  private async resequenceItems(projectId: string): Promise<void> {
    const items = await this.itemRepo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    items.forEach((it, idx) => {
      it.order = idx + 1;
      it.taskId = `T${String(idx + 1).padStart(2, '0')}`;
    });

    if (items.length > 0) await this.itemRepo.save(items);
  }

  async deleteWbs(userId: string, projectId: string): Promise<void> {
    await this.assertPm(userId, projectId);

    const wbs = await this.wbsRepo.findOne({ where: { projectId } });
    if (!wbs) throw new NotFoundException('WBS가 존재하지 않습니다.');

    // wbs_items는 FK onDelete CASCADE로 함께 삭제됨
    await this.wbsRepo.remove(wbs);
  }

  async getMeetingRecommendations(userId: string, projectId: string): Promise<object> {
    await this.projectsService.findOne(userId, projectId);

    const wbs = await this.wbsRepo.findOne({
      where: { projectId, status: WbsStatus.CONFIRMED },
      relations: ['items'],
      order: { items: { order: 'ASC' } },
    });
    if (!wbs) throw new BadRequestException('확정된 WBS가 없습니다. WBS를 먼저 확정하세요.');

    const raws = await this.llmService.recommendMeetings(this.buildWbsContext(wbs));

    const recommendations = raws
      .map((r) => ({
        title: r.title,
        meetingType: this.normalizeMeetingType(r.meeting_type),
        suggestedDate: r.suggested_date,
        reason: r.reason,
        relatedPhase: r.related_phase ?? null,
      }))
      .filter((r) => r.meetingType !== null);

    return { recommendations };
  }

  private buildWbsContext(wbs: ProjectWbs): string {
    const lines: string[] = [];
    if (wbs.projectSummary) lines.push(`프로젝트 요약: ${wbs.projectSummary}`);
    if (wbs.totalDuration) lines.push(`전체 기간: ${wbs.totalDuration}`);
    lines.push('태스크 목록:');
    for (const item of wbs.items ?? []) {
      const start = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '미정';
      const end = item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '미정';
      lines.push(`- [${item.phase}] ${item.title} (시작: ${start}, 종료: ${end})`);
    }
    return lines.join('\n');
  }

  private normalizeMeetingType(value: string): string | null {
    const valid = ['KICKOFF', 'PROGRESS_CHECK', 'ISSUE_CHECK', 'CONSENSUS'];
    const v = (value ?? '').toUpperCase();
    return valid.includes(v) ? v : null;
  }

  private async assertPm(userId: string, projectId: string): Promise<void> {
    const project = await this.projectsService.findOne(userId, projectId);
    const isPm = project.members?.some(
      (m) => m.userId === userId && m.role === MemberRole.PM,
    );
    if (!isPm) throw new ForbiddenException('PM 권한이 필요합니다.');
  }
}
