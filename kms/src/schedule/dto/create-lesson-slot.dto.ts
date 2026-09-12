import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateLessonSlotDto {
  @IsUUID()
  groupId: string;

  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @IsInt()
  @Min(1)
  lessonNumber: number;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  teacherId: string;

  @IsOptional()
  @IsString()
  room?: string;
}
