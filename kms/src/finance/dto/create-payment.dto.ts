import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod } from '../payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  childId: string;

  @IsNumberString()
  amount: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsDateString()
  paidAt: string;

  @IsOptional()
  @IsString()
  note?: string;
}
