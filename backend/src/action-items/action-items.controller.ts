import {
  Body,
  Controller,
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
import { ActionItemsService } from './action-items.service';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { ActionItemStatus } from './entities/action-item.entity';

@Controller('action-items')
@UseGuards(JwtAuthGuard)
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Patch(':itemId')
  @HttpCode(200)
  toggle(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.actionItemsService.toggle(user.id, itemId);
  }
}

@Controller('projects/:projectId/action-items')
@UseGuards(JwtAuthGuard)
export class ProjectActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Query('status') status?: ActionItemStatus,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.actionItemsService.findByProject(user.id, projectId, status, assigneeId);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: CreateActionItemDto,
  ) {
    return this.actionItemsService.create(user.id, projectId, dto);
  }
}
