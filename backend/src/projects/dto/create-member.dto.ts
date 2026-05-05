import { IsEnum, IsUUID } from 'class-validator';
import { MemberRole } from '../entities/project-member.entity';

export class CreateMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}
