import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ProjectsService } from './projects.service';
import { MemberRole } from './entities/project-member.entity';
import { ProjectWbs, WbsStatus } from './entities/project-wbs.entity';
import { WbsItem } from './entities/wbs-item.entity';
import { LlmService } from '../common/llm/llm.service';

export class UpdateWbsItemDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() assignedRole?: string;
  @IsOptional() @IsNumber() durationDays?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsBoolean() isDecisionPoint?: boolean;
}

@Injectable()
export class WbsService {
  constructor(
    @InjectRepository(ProjectWbs)
    private readonly wbsRepo: Repository<ProjectWbs>,
    @InjectRepository(WbsItem)
    private readonly itemRepo: Repository<WbsItem>,
    private readonly projectsService: ProjectsService,
    private readonly llmService: LlmService,
  ) {}

  async generateFromDocument(
    projectId: string,
    documentId: string,
    documentText: string,
  ): Promise<ProjectWbs> {
    const result = await this.llmService.generateWbs(documentText);

    // 기존 WBS 덮어쓰기
    const existing = await this.wbsRepo.findOne({ where: { projectId } });
    if (existing) await this.wbsRepo.remove(existing);

    const wbs = this.wbsRepo.create({
      projectId,
      documentId,
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

    return this.findWbs(projectId);
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

  async getMeetingRecommendations(userId: string, projectId: string): Promise<object[]> {
    await this.projectsService.findOne(userId, projectId);

    const wbs = await this.wbsRepo.findOne({
      where: { projectId, status: WbsStatus.CONFIRMED },
    });
    if (!wbs) throw new BadRequestException('확정된 WBS가 없습니다. WBS를 먼저 확정하세요.');

    const milestones = await this.itemRepo.find({
      where: { projectId, isDecisionPoint: true },
      order: { order: 'ASC' },
    });

    return milestones.map((m) => ({
      milestoneId: m.id,
      milestoneTitle: m.title,
      phase: m.phase,
      milestoneDate: m.startDate,
      recommendedMeetingDate: this.subtractDays(m.startDate, 2),
      meetingType: this.recommendMeetingType(m.phase),
    }));
  }

  private subtractDays(date: Date | null, days: number): string | null {
    if (!date) return null;
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  private recommendMeetingType(phase: string): string {
    const map: Record<string, string> = {
      계획: 'KICKOFF',
      분석: 'ISSUE_CHECK',
      설계: 'CONSENSUS',
      개발: 'PROGRESS_CHECK',
      테스트: 'ISSUE_CHECK',
      배포: 'CONSENSUS',
      유지보수: 'PROGRESS_CHECK',
    };
    return map[phase] ?? 'PROGRESS_CHECK';
  }

  private async assertPm(userId: string, projectId: string): Promise<void> {
    const project = await this.projectsService.findOne(userId, projectId);
    const isPm = project.members?.some(
      (m) => m.userId === userId && m.role === MemberRole.PM,
    );
    if (!isPm) throw new ForbiddenException('PM 권한이 필요합니다.');
  }
}
