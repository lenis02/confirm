import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateMeetingDto } from './create-meeting.dto';

export class CreateMeetingsFromRecommendationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMeetingDto)
  meetings: CreateMeetingDto[];
}
