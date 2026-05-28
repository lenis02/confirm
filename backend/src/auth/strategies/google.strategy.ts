import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/calendar.events'],
    });
  }

  // 리프레시 토큰을 받기 위해 인증 URL에 offline + 매번 동의 파라미터 추가
  authorizationParams(): Record<string, string> {
    return { access_type: 'offline', prompt: 'consent' };
  }

  async validate(
    _accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    const { id, emails, displayName } = profile;
    return this.authService.findOrCreateUser({
      provider: 'google',
      providerId: id,
      email: emails?.[0]?.value ?? '',
      name: displayName,
      googleRefreshToken: refreshToken, // 평문 → authService에서 암호화 저장
    });
  }
}
