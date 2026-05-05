import { IsEnum } from 'class-validator';
import { MemberRole } from '../entities/project-member.entity';

export class UpdateMemberDto {
  @IsEnum(MemberRole)
  role: MemberRole;
}
