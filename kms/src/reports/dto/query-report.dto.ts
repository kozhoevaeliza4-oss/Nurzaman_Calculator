import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class QueryReportDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: 'json' | 'csv';
}
