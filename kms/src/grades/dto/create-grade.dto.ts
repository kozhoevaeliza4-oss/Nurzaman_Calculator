import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateGradeDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  groupId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  @Max(10)
  value: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
