import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateHomeworkDto {
  @IsUUID()
  groupId: string;

  @IsUUID()
  subjectId: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  description: string;
}
