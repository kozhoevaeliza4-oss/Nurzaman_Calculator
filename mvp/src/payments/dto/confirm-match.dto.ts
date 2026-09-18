import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ConfirmAction {
  CONFIRM = 'confirm',
  NOT_A_PAYMENT = 'not_a_payment',
}

// ТЗ раздел 17: "[Подтвердить] [Выбрать другого ребёнка] [Не является
// оплатой]" - CONFIRM covers both "confirm the suggestion" (send the same
// childId back) and "pick a different child" (send a different childId).
export class ConfirmMatchDto {
  @IsEnum(ConfirmAction)
  action: ConfirmAction;

  @IsOptional()
  @IsUUID()
  childId?: string;

  @IsOptional()
  @IsString()
  periodYearMonth?: string;
}
