import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class CreateExamDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  groupId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  maxScore: number;
}
