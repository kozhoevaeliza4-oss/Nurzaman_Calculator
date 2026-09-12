import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Direction } from '../../common/direction.enum';

export class CreateCategoryDto {
  @IsString()
  name: string;

  // Omit for a shared/org-wide cost that counts toward both directions.
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;
}
