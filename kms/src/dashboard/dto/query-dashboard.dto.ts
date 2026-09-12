import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Direction } from '../../common/direction.enum';

export class QueryDashboardDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  // Lets a both-direction viewer (director/accountant/medic) narrow the
  // summary to one direction instead of the combined+byDirection view.
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;
}
