import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

interface OAuthUserPayload {
  provider: string;
  providerId: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async findOrCreateUser(payload: OAuthUserPayload): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { providerId: payload.providerId },
    });

    if (!user) {
      user = this.userRepository.create(payload);
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
