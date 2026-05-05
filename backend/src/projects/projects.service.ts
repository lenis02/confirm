import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { MemberRole, ProjectMember } from './entities/project-member.entity';
import { Project, ProjectStatus } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create({
      ...dto,
      ownerId: userId,
    });
    const saved = await this.projectRepo.save(project);

    const member = this.memberRepo.create({
      projectId: saved.id,
      userId,
      role: MemberRole.PM,
    });
    await this.memberRepo.save(member);

    return this.findOne(userId, saved.id);
  }

  async findAll(userId: string, status?: ProjectStatus): Promise<Project[]> {
    const qb = this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member', 'member.user_id = :userId', { userId })
      .leftJoinAndSelect('project.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'user');

    if (status) {
      qb.andWhere('project.status = :status', { status });
    }

    return qb.orderBy('project.created_at', 'DESC').getMany();
  }

  async findOne(userId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.user'],
    });

    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');

    this.assertMember(project, userId);
    return project;
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(userId, projectId);
    this.assertPm(project, userId);

    Object.assign(project, dto);
    await this.projectRepo.save(project);
    return this.findOne(userId, projectId);
  }

  async remove(userId: string, projectId: string): Promise<void> {
    const project = await this.findOne(userId, projectId);
    this.assertPm(project, userId);
    await this.projectRepo.remove(project);
  }

  // --- members ---

  async findMembers(userId: string, projectId: string): Promise<ProjectMember[]> {
    await this.findOne(userId, projectId);
    return this.memberRepo.find({
      where: { projectId },
      relations: ['user'],
    });
  }

  async addMember(
    userId: string,
    projectId: string,
    dto: CreateMemberDto,
  ): Promise<ProjectMember> {
    const project = await this.findOne(userId, projectId);
    this.assertPm(project, userId);

    const exists = await this.memberRepo.findOne({
      where: { projectId, userId: dto.userId },
    });
    if (exists) throw new ConflictException('이미 프로젝트 멤버입니다.');

    const member = this.memberRepo.create({ projectId, ...dto });
    const saved = await this.memberRepo.save(member);
    return this.memberRepo.findOne({ where: { id: saved.id }, relations: ['user'] }) as Promise<ProjectMember>;
  }

  async updateMember(
    userId: string,
    projectId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<ProjectMember> {
    const project = await this.findOne(userId, projectId);
    this.assertPm(project, userId);

    const member = await this.memberRepo.findOne({ where: { id: memberId, projectId }, relations: ['user'] });
    if (!member) throw new NotFoundException('멤버를 찾을 수 없습니다.');

    member.role = dto.role;
    return this.memberRepo.save(member);
  }

  async removeMember(userId: string, projectId: string, memberId: string): Promise<void> {
    const project = await this.findOne(userId, projectId);
    this.assertPm(project, userId);

    const member = await this.memberRepo.findOne({ where: { id: memberId, projectId } });
    if (!member) throw new NotFoundException('멤버를 찾을 수 없습니다.');

    if (member.userId === userId) {
      throw new ForbiddenException('본인을 프로젝트에서 제거할 수 없습니다.');
    }

    await this.memberRepo.remove(member);
  }

  // --- helpers ---

  private assertMember(project: Project, userId: string): void {
    const isMember = project.members?.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('프로젝트 멤버가 아닙니다.');
  }

  private assertPm(project: Project, userId: string): void {
    const isPm = project.members?.some(
      (m) => m.userId === userId && m.role === MemberRole.PM,
    );
    if (!isPm) throw new ForbiddenException('PM 권한이 필요합니다.');
  }
}
