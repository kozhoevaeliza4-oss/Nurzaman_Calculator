import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  SNACK = 'snack',
}

// Module 15: "Планирование меню на неделю/период (завтрак, обед, полдник)."
@Entity('menu_items')
export class MenuItem extends BaseEntity {
  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'meal_type', type: 'enum', enum: MealType })
  mealType: MealType;

  @Column({ name: 'dish_name' })
  dishName: string;

  // Free-text allergen tags, matched against Child.allergies for warnings.
  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  allergens: string[];
}
