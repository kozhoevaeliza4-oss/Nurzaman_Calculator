import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ChildStatus } from '../child.entity';
import { Direction } from '../../common/direction.enum';

// Module 1: "Поиск и фильтрация по группе, статусу, возрасту."
export class QueryChildrenDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @IsOptional()
  @IsString()
  search?: string;

  // Only meaningful for a director/accountant/medic (both-direction
  // access) wanting to filter the combined view down to one direction.
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;
}
