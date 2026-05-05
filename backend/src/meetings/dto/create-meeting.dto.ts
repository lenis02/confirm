import { IsDateString, IsEnum, IsString, MinLength } from 'class-validator';
import { MeetingType } from '../entities/meeting.entity';

export class CreateMeetingDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsEnum(MeetingType)
  type: MeetingType;

  @IsDateString()
  scheduledAt: string;
}
