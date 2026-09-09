import { IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

// Exactly one of groupId / childId must be set (enforced in the service).
export class CreateTariffDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  childId?: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  description?: string;
}
