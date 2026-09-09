import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ChildStatus } from '../child.entity';

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
}
