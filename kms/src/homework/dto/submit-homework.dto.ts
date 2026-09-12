import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitHomeworkDto {
  @IsUUID()
  studentId: string;

  @IsBoolean()
  done: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
