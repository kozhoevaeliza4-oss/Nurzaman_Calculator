import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { ChargeType } from '../charge.entity';

export class CreateChargeDto {
  @IsUUID()
  childId: string;

  @IsNumberString()
  amount: string;

  @IsEnum(ChargeType)
  type: ChargeType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate: string;
}
