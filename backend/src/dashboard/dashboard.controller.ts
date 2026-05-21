import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('calendar')
  getCalendar(@CurrentUser() user: User, @Query('week') week?: string) {
    return this.dashboardService.getCalendar(user.id, week);
  }

  @Get('overview')
  getMonthlyOverview(
    @CurrentUser() user: User,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const y = year  ? parseInt(year,  10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth(); // 0-indexed
    return this.dashboardService.getMonthlyOverview(user.id, y, m);
  }
}
