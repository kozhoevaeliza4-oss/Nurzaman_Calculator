import { IsDateString } from 'class-validator';

// Generates a monthly_tariff charge, due on dueDate, for every active child
// in the group, using each child's resolved tariff (child override or the
// group's tariff).
export class AccrueMonthlyDto {
  @IsDateString()
  dueDate: string;
}
