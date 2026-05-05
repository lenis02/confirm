import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { MemberRole } from '../projects/entities/project-member.entity';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { ActionItem, ActionItemStatus } from './entities/action-item.entity';

@Injectable()
export class ActionItemsService {
  constructor(
    @InjectRepository(ActionItem)
    private readonly actionItemRepo: Repository<ActionItem>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateActionItemDto): Promise<ActionItem> {
    await this.assertPm(userId, projectId);

    const item = this.actionItemRepo.create({
      projectId,
      createdById: userId,
      title: dto.title,
      assigneeId: dto.assigneeId,
      dueDate: new Date(dto.dueDate),
    });
    if (dto.meetingId) item.meetingId = dto.meetingId;
    const saved = await this.actionItemRepo.save(item);
    return this.findOneRaw(saved.id);
  }

  async findByProject(
    userId: string,
    projectId: string,
    status?: ActionItemStatus,
    assigneeId?: string,
  ): Promise<ActionItem[]> {
    await this.projectsService.findOne(userId, projectId);

    const where: any = { projectId };
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    return this.actionItemRepo.find({
      where,
      relations: ['assignee', 'completedBy', 'createdBy'],
      order: { dueDate: 'ASC' },
    });
  }

  async toggle(userId: string, itemId: string): Promise<ActionItem> {
    const item = await this.findOneRaw(itemId);
    await this.projectsService.findOne(userId, item.projectId);

    if (item.status === ActionItemStatus.PENDING) {
      item.status = ActionItemStatus.COMPLETED;
      item.completedAt = new Date();
      item.completedById = userId;
    } else {
      item.status = ActionItemStatus.PENDING;
      item.completedAt = null;
      item.completedById = null;
    }

    return this.actionItemRepo.save(item);
  }

  async markCarriedOver(projectId: string): Promise<void> {
    await this.actionItemRepo
      .createQueryBuilder()
      .update(ActionItem)
      .set({ isCarriedOver: true })
      .where('project_id = :projectId AND status = :status', {
        projectId,
        status: ActionItemStatus.PENDING,
      })
      .execute();
  }

  async findCarriedOver(projectId: string): Promise<ActionItem[]> {
    return this.actionItemRepo.find({
      where: { projectId, isCarriedOver: true, status: ActionItemStatus.PENDING },
      relations: ['assignee'],
      order: { dueDate: 'ASC' },
    });
  }

  private async findOneRaw(itemId: string): Promise<ActionItem> {
    const item = await this.actionItemRepo.findOne({
      where: { id: itemId },
      relations: ['assignee', 'completedBy', 'createdBy'],
    });
    if (!item) throw new NotFoundException('Action Item을 찾을 수 없습니다.');
    return item;
  }

  private async assertPm(userId: string, projectId: string): Promise<void> {
    const project = await this.projectsService.findOne(userId, projectId);
    const isPm = project.members?.some(
      (m) => m.userId === userId && m.role === MemberRole.PM,
    );
    if (!isPm) throw new ForbiddenException('PM 권한이 필요합니다.');
  }
}
