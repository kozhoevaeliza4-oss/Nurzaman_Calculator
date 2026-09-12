import { IsInt, Max, Min } from 'class-validator';

export class OverridePeriodGradeDto {
  @IsInt()
  @Min(1)
  @Max(10)
  manualOverride: number;
}
