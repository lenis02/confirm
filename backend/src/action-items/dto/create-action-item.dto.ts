import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateActionItemDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsUUID()
  assigneeId: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsUUID()
  meetingId?: string;
}
