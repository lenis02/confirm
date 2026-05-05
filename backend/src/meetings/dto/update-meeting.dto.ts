import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
