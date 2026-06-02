import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MeetingType } from '../entities/meeting.entity';

export class CreateMeetingDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsEnum(MeetingType)
  type: MeetingType;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];
}
