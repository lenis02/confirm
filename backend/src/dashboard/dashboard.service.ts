import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ActionItem } from '../action-items/entities/action-item.entity';
import { WbsItem } from '../projects/entities/wbs-item.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(ActionItem)
    private readonly actionItemRepo: Repository<ActionItem>,
    @InjectRepository(WbsItem)
    private readonly wbsItemRepo: Repository<WbsItem>,
  ) {}

  async getCalendar(userId: string, week?: string) {
    const { start, end } = this.resolveWeekRange(week);

    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['project'],
    });

    const projectIds = memberships.map((m) => m.projectId);

    if (projectIds.length === 0) {
      return { week: { start, end }, projects: [] };
    }

    const [meetings, actionItems, wbsItems] = await Promise.all([
      this.meetingRepo
        .createQueryBuilder('meeting')
        .where('meeting.project_id IN (:...projectIds)', { projectIds })
        .andWhere('meeting.scheduled_at >= :start', { start })
        .andWhere('meeting.scheduled_at <= :end', { end })
        .orderBy('meeting.scheduled_at', 'ASC')
        .getMany(),

      this.actionItemRepo
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.assignee', 'assignee')
        .where('item.project_id IN (:...projectIds)', { projectIds })
        .andWhere('item.due_date >= :start', { start })
        .andWhere('item.due_date <= :end', { end })
        .orderBy('item.due_date', 'ASC')
        .getMany(),

      // 시작일 또는 종료일이 이번 주에 걸치는 WBS 태스크를 마일스톤으로 노출
      this.wbsItemRepo
        .createQueryBuilder('wbs')
        .where('wbs.project_id IN (:...projectIds)', { projectIds })
        .andWhere(
          '(wbs.end_date BETWEEN :start AND :end OR wbs.start_date BETWEEN :start AND :end)',
          { start, end },
        )
        .orderBy('wbs.start_date', 'ASC')
        .addOrderBy('wbs.order', 'ASC')
        .getMany(),
    ]);

    const meetingsByProject = this.groupBy(meetings, (m) => m.projectId);
    const actionsByProject = this.groupBy(actionItems, (a) => a.projectId);
    const wbsByProject = this.groupBy(wbsItems, (w) => w.projectId);

    const projects = memberships.map(({ project, role }) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      myRole: role,
      meetings: (meetingsByProject[project.id] ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        status: m.status,
        scheduledAt: m.scheduledAt,
      })),
      actionItems: (actionsByProject[project.id] ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        dueDate: a.dueDate,
        isCarriedOver: a.isCarriedOver,
        assignee: a.assignee
          ? { id: a.assignee.id, name: a.assignee.name }
          : null,
      })),
      milestones: (wbsByProject[project.id] ?? []).map((w) => ({
        id: w.id,
        title: w.title,
        phase: w.phase,
        assignedRole: w.assignedRole,
        isDecisionPoint: w.isDecisionPoint,
        startDate: w.startDate,
        endDate: w.endDate,
      })),
    }));

    return { week: { start, end }, projects };
  }

  private resolveWeekRange(week?: string): { start: Date; end: Date } {
    const base = week ? new Date(week) : new Date();

    // ISO 기준 월요일 계산
    const day = base.getDay(); // 0=일, 1=월, ..., 6=토
    const diffToMonday = (day === 0 ? -6 : 1 - day);

    const start = new Date(base);
    start.setDate(base.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
    return arr.reduce<Record<string, T[]>>((acc, item) => {
      const k = key(item);
      (acc[k] ??= []).push(item);
      return acc;
    }, {});
  }
}
