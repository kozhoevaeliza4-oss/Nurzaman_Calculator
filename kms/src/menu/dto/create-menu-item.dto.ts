import { IsArray, IsDateString, IsEnum, IsString } from 'class-validator';
import { MealType } from '../menu-item.entity';

export class CreateMenuItemDto {
  @IsDateString()
  date: string;

  @IsEnum(MealType)
  mealType: MealType;

  @IsString()
  dishName: string;

  @IsArray()
  @IsString({ each: true })
  allergens: string[];
}
