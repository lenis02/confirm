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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from './entities/project.entity';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

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
}
