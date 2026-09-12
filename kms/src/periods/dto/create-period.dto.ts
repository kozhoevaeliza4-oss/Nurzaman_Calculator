import { IsDateString, IsString } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  academicYear: string;
}
