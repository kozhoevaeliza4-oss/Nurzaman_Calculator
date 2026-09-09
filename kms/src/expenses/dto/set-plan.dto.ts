import { IsNumberString, IsUUID, Matches } from 'class-validator';

export class SetPlanDto {
  @IsUUID()
  categoryId: string;

  @Matches(/^\d{4}-\d{2}$/, { message: 'period must be YYYY-MM' })
  period: string;

  @IsNumberString()
  plannedAmount: string;
}
