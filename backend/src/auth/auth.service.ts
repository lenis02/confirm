import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EncryptionService } from '../common/crypto/encryption.service';

interface OAuthUserPayload {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  googleRefreshToken?: string; // 평문 (여기서 암호화)
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryption: EncryptionService,
  ) {}

  async findOrCreateUser(payload: OAuthUserPayload): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { providerId: payload.providerId },
    });

    // 구글이 리프레시 토큰을 준 경우에만 암호화 (재로그인 시 갱신)
    const encryptedToken = payload.googleRefreshToken
      ? this.encryption.encrypt(payload.googleRefreshToken)
      : undefined;

    if (!user) {
      user = this.userRepository.create({
        provider: payload.provider,
        providerId: payload.providerId,
        email: payload.email,
        name: payload.name,
        googleRefreshToken: encryptedToken ?? null,
      });
      await this.userRepository.save(user);
    } else if (encryptedToken) {
      user.googleRefreshToken = encryptedToken;
      await this.userRepository.save(user);
    }

    return user;
  }

  issueTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_SECRET')!,
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '2h'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '14d'),
      },
    );

    return { accessToken, refreshToken };
  }
}
