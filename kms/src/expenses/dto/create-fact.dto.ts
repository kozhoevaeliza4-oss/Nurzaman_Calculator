import { IsDateString, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFactDto {
  @IsUUID()
  categoryId: string;

  @IsNumberString()
  amount: string;

  @IsDateString()
  spentAt: string;

  @IsOptional()
  @IsString()
  description?: string;
}
