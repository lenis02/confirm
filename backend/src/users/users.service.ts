import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { decrypt, encrypt } from './encryption.util';
import {
  IntegrationStatus,
  UserIntegration,
} from './entities/user-integration.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserIntegration)
    private readonly integrationRepository: Repository<UserIntegration>,
  ) {}

  async getMe(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.getMe(userId);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async createIntegration(
    userId: string,
    dto: CreateIntegrationDto,
  ): Promise<UserIntegration> {
    const existing = await this.integrationRepository.findOne({
      where: { userId, serviceType: dto.serviceType },
    });
    if (existing) {
      throw new ConflictException(
        `${dto.serviceType} 연동이 이미 존재합니다.`,
      );
    }

    const integration = this.integrationRepository.create({
      userId,
      serviceType: dto.serviceType,
      accessToken: encrypt(dto.accessToken),
    });
    return this.integrationRepository.save(integration);
  }

  async getIntegrations(userId: string): Promise<UserIntegration[]> {
    return this.integrationRepository.find({ where: { userId } });
  }

  async deleteIntegration(
    userId: string,
    integrationId: string,
  ): Promise<void> {
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId, userId },
    });
    if (!integration) throw new NotFoundException('연동 정보를 찾을 수 없습니다.');
    await this.integrationRepository.remove(integration);
  }
}
