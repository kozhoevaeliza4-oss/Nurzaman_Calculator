import { IsDateString } from 'class-validator';

export class QueryMenuDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
