import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryAuditDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
