import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Post('integrations')
  createIntegration(
    @CurrentUser() user: User,
    @Body() dto: CreateIntegrationDto,
  ) {
    return this.usersService.createIntegration(user.id, dto);
  }

  @Get('integrations')
  getIntegrations(@CurrentUser() user: User) {
    return this.usersService.getIntegrations(user.id);
  }

  @Delete('integrations/:integrationId')
  @HttpCode(204)
  deleteIntegration(
    @CurrentUser() user: User,
    @Param('integrationId') integrationId: string,
  ) {
    return this.usersService.deleteIntegration(user.id, integrationId);
  }
}
