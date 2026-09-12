import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ExamResultDto {
  @IsUUID()
  studentId: string;

  @IsInt()
  @Min(0)
  score: number;
}

export class SetExamResultsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExamResultDto)
  results: ExamResultDto[];
}
