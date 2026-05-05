import { Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const { accessToken, refreshToken } = this.authService.issueTokens(user.id);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  refresh(@Req() req: Request) {
    const user = req.user as User;
    const { accessToken } = this.authService.issueTokens(user.id);
    return { accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  logout() {
    return { message: 'Logged out successfully' };
  }
}
