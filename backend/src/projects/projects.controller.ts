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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from './entities/project.entity';
import { DocumentStatus } from './entities/document.entity';
import { ProjectsService } from './projects.service';
import { DocumentsService } from './documents.service';
import { WbsService, UpdateWbsItemDto, UpdateTeamResourcesDto } from './wbs.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly documentsService: DocumentsService,
    private readonly wbsService: WbsService,
  ) {}

  // --- projects ---

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query('status') status?: ProjectStatus) {
    return this.projectsService.findAll(user.id, status);
  }

  @Get(':projectId')
  findOne(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectsService.findOne(user.id, projectId);
  }

  @Patch(':projectId')
  update(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.id, projectId, dto);
  }

  @Delete(':projectId')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectsService.remove(user.id, projectId);
  }

  // --- members ---

  @Get(':projectId/members')
  findMembers(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectsService.findMembers(user.id, projectId);
  }

  @Post(':projectId/members')
  addMember(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: CreateMemberDto,
  ) {
    return this.projectsService.addMember(user.id, projectId, dto);
  }

  @Patch(':projectId/members/:memberId')
  updateMember(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.projectsService.updateMember(user.id, projectId, memberId, dto);
  }

  @Delete(':projectId/members/:memberId')
  @HttpCode(204)
  removeMember(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectsService.removeMember(user.id, projectId, memberId);
  }

  // --- documents ---

  @Post(':projectId/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadDocument(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.upload(user.id, projectId, file);
  }

  @Get(':projectId/documents')
  findDocuments(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Query('status') status?: DocumentStatus,
  ) {
    return this.documentsService.findAll(user.id, projectId, status);
  }

  @Get(':projectId/documents/:documentId')
  findDocument(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.findOne(user.id, projectId, documentId);
  }

  @Delete(':projectId/documents/:documentId')
  @HttpCode(204)
  removeDocument(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.remove(user.id, projectId, documentId);
  }

  // --- wbs ---

  @Get(':projectId/wbs')
  getWbs(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.wbsService.findWbs(projectId, user.id);
  }

  @Patch(':projectId/wbs')
  confirmWbs(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.wbsService.confirmWbs(user.id, projectId);
  }

  // 정적 경로(team-resources)는 :milestoneId 파라미터 라우트보다 먼저 선언해야 매칭됨
  @Patch(':projectId/wbs/team-resources')
  updateTeamResources(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateTeamResourcesDto,
  ) {
    return this.wbsService.updateTeamResources(user.id, projectId, dto.teamResources);
  }

  @Patch(':projectId/wbs/:milestoneId')
  updateWbsItem(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateWbsItemDto,
  ) {
    return this.wbsService.updateItem(user.id, projectId, milestoneId, dto);
  }

  @Delete(':projectId/wbs/:itemId')
  @HttpCode(204)
  deleteWbsItem(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.wbsService.deleteItem(user.id, projectId, itemId);
  }

  @Delete(':projectId/wbs')
  @HttpCode(204)
  deleteWbs(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.wbsService.deleteWbs(user.id, projectId);
  }

  @Get(':projectId/meeting-recommendations')
  getMeetingRecommendations(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.wbsService.getMeetingRecommendations(user.id, projectId);
  }
}
