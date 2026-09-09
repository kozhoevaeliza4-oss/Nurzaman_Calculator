import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charge, ChargeType } from './charge.entity';
import { CreateChargeDto } from './dto/create-charge.dto';
import { ChildrenService } from '../children/children.service';
import { ChildStatus } from '../children/child.entity';
import { TariffsService } from './tariffs.service';

@Injectable()
export class ChargesService {
  constructor(
    @InjectRepository(Charge) private readonly repo: Repository<Charge>,
    private readonly childrenService: ChildrenService,
    private readonly tariffsService: TariffsService,
  ) {}

  findForChild(childId: string): Promise<Charge[]> {
    return this.repo.find({ where: { childId }, order: { dueDate: 'DESC' } });
  }

  async create(dto: CreateChargeDto): Promise<Charge> {
    // Throws NotFoundException if the child doesn't exist.
    await this.childrenService.findOne(dto.childId);
    return this.repo.save(this.repo.create(dto));
  }

  // Module 3: "разовые и ежемесячные начисления" — bulk-generate the
  // monthly tariff charge for every active child in a group.
  async accrueMonthlyForGroup(groupId: string, dueDate: string): Promise<Charge[]> {
    const children = await this.childrenService.findAll({ groupId, status: ChildStatus.ACTIVE });
    const created: Charge[] = [];

    for (const child of children) {
      const tariff = await this.tariffsService.resolveForChild(child.id, child.groupId);
      if (!tariff) continue; // no tariff configured — skip rather than guess an amount

      created.push(
        await this.repo.save(
          this.repo.create({
            childId: child.id,
            amount: tariff.amount,
            type: ChargeType.MONTHLY_TARIFF,
            description: `Ежемесячный тариф (${dueDate})`,
            dueDate,
          }),
        ),
      );
    }

    return created;
  }

  // Module 10: total charged in [from, to], for the finance report.
  async totalForRange(from: string, to: string): Promise<string> {
    const row = await this.repo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'sum')
      .where('c.due_date >= :from AND c.due_date <= :to', { from, to })
      .getRawOne<{ sum: string }>();
    return Number(row?.sum ?? 0).toFixed(2);
  }
}
