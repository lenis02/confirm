import { IsEmail, IsEnum } from 'class-validator';
import { MemberRole } from '../entities/project-member.entity';

export class CreateMemberDto {
  @IsEmail({}, { message: '유효한 이메일을 입력해 주세요.' })
  email: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}
