import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getMe(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  // 팀원 초대를 위한 이메일 기반 유저 검색 (부분 일치, 최대 10명)
  async searchByEmail(
    email: string,
    excludeUserId?: string,
  ): Promise<Pick<User, 'id' | 'email' | 'name' | 'jobTitle'>[]> {
    const keyword = email?.trim();
    if (!keyword) return [];

    const users = await this.userRepository.find({
      where: { email: ILike(`%${keyword}%`) },
      order: { email: 'ASC' },
      take: 10,
    });

    return users
      .filter((u) => u.id !== excludeUserId)
      .map((u) => ({ id: u.id, email: u.email, name: u.name, jobTitle: u.jobTitle }));
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.getMe(userId);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  // TODO: 외부 서비스 연동 메서드 (Naver Works, Notion) — 미개발 범위
  // createIntegration / getIntegrations / deleteIntegration
}
