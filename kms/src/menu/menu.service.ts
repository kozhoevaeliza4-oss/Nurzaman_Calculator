import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { MenuItem } from './menu-item.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ChildrenService } from '../children/children.service';
import { ChildStatus } from '../children/child.entity';

export interface AllergyWarning {
  menuItemId: string;
  dishName: string;
  matchedAllergens: string[];
  childId: string;
  childFullName: string;
  groupId: string | null;
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem) private readonly repo: Repository<MenuItem>,
    private readonly childrenService: ChildrenService,
  ) {}

  findForRange(from: string, to: string): Promise<MenuItem[]> {
    return this.repo.find({
      where: { date: Between(from, to) },
      order: { date: 'ASC', mealType: 'ASC' },
    });
  }

  async findOne(id: string): Promise<MenuItem> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  create(dto: CreateMenuItemDto): Promise<MenuItem> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
  }

  // Module 15: "Предупреждение при совпадении блюда меню с аллергеном
  // ребёнка группы." Checked against every active child, not just one
  // group, so it also works for the kitchen's full-menu view.
  async allergyWarningsForDate(date: string): Promise<AllergyWarning[]> {
    const [items, children] = await Promise.all([
      this.findForRange(date, date),
      this.childrenService.findAll({ status: ChildStatus.ACTIVE }),
    ]);

    const warnings: AllergyWarning[] = [];
    for (const item of items) {
      if (item.allergens.length === 0) continue;
      for (const child of children) {
        const matched = child.allergies.filter((allergy) => item.allergens.includes(allergy));
        if (matched.length > 0) {
          warnings.push({
            menuItemId: item.id,
            dishName: item.dishName,
            matchedAllergens: matched,
            childId: child.id,
            childFullName: child.fullName,
            groupId: child.groupId,
          });
        }
      }
    }
    return warnings;
  }
}
