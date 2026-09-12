import { IsEnum, IsOptional } from 'class-validator';
import { Direction } from '../../common/direction.enum';

export class QueryGroupsDto {
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;
}
