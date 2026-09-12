import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseCategory } from './expense-category.entity';
import { ExpensePlan } from './expense-plan.entity';
import { ExpenseFact } from './expense-fact.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { SetPlanDto } from './dto/set-plan.dto';
import { CreateFactDto } from './dto/create-fact.dto';
import { Direction } from '../common/direction.enum';

export interface PlanVsFactRow {
  categoryId: string;
  categoryName: string;
  planned: string;
  actual: string;
  deviation: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(ExpenseCategory) private readonly categoriesRepo: Repository<ExpenseCategory>,
    @InjectRepository(ExpensePlan) private readonly plansRepo: Repository<ExpensePlan>,
    @InjectRepository(ExpenseFact) private readonly factsRepo: Repository<ExpenseFact>,
  ) {}

  findAllCategories(): Promise<ExpenseCategory[]> {
    return this.categoriesRepo.find({ order: { name: 'ASC' } });
  }

  createCategory(dto: CreateCategoryDto): Promise<ExpenseCategory> {
    return this.categoriesRepo.save(this.categoriesRepo.create(dto));
  }

  async setPlan(dto: SetPlanDto): Promise<ExpensePlan> {
    const existing = await this.plansRepo.findOne({
      where: { categoryId: dto.categoryId, period: dto.period },
    });
    if (existing) {
      existing.plannedAmount = dto.plannedAmount;
      return this.plansRepo.save(existing);
    }
    return this.plansRepo.save(this.plansRepo.create(dto));
  }

  createFact(dto: CreateFactDto): Promise<ExpenseFact> {
    return this.factsRepo.save(this.factsRepo.create(dto));
  }

  async removeFact(id: string): Promise<void> {
    const fact = await this.factsRepo.findOne({ where: { id } });
    if (!fact) throw new NotFoundException('Expense not found');
    await this.factsRepo.remove(fact);
  }

  // Module 11: "Сравнение план/факт, отклонения."
  async planVsFact(period: string): Promise<PlanVsFactRow[]> {
    const [categories, plans] = await Promise.all([this.findAllCategories(), this.plansRepo.find({ where: { period } })]);
    const [start, monthStr] = [`${period}-01`, period];
    const [year, month] = monthStr.split('-').map(Number);
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const rows: PlanVsFactRow[] = [];
    for (const category of categories) {
      const plan = plans.find((p) => p.categoryId === category.id);
      const factSum = await this.factsRepo
        .createQueryBuilder('f')
        .select('COALESCE(SUM(f.amount), 0)', 'sum')
        .where('f.category_id = :categoryId', { categoryId: category.id })
        .andWhere('f.spent_at >= :start AND f.spent_at < :nextMonth', { start, nextMonth })
        .getRawOne<{ sum: string }>();

      const planned = Number(plan?.plannedAmount ?? 0);
      const actual = Number(factSum?.sum ?? 0);
      rows.push({
        categoryId: category.id,
        categoryName: category.name,
        planned: planned.toFixed(2),
        actual: actual.toFixed(2),
        deviation: (actual - planned).toFixed(2),
      });
    }
    return rows;
  }

  // Module 8: "Расходы ... в реальном времени." — total actual spend in
  // [from, to] across every category.
  async totalActualForRange(from: string, to: string, direction?: Direction): Promise<string> {
    const qb = this.factsRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.amount), 0)', 'sum')
      .where('f.spent_at >= :from AND f.spent_at <= :to', { from, to });
    if (direction) {
      qb.innerJoin('expense_categories', 'cat', 'cat.id = f.category_id').andWhere(
        '(cat.direction = :direction OR cat.direction IS NULL)',
        { direction },
      );
    }
    const row = await qb.getRawOne<{ sum: string }>();
    return Number(row?.sum ?? 0).toFixed(2);
  }
}
