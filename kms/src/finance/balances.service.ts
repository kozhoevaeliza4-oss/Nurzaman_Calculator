import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charge } from './charge.entity';
import { Payment } from './payment.entity';
import { ChildrenService } from '../children/children.service';
import { ChildStatus } from '../children/child.entity';
import { Direction } from '../common/direction.enum';
import { QueryChildrenDto } from '../children/dto/query-children.dto';

export interface Balance {
  charged: string;
  paid: string;
  debt: string;
}

// Module 3: "Автоматический расчёт задолженности на текущую дату,
// список должников." Only charges due on or before today count toward
// the debt — a charge due next month isn't debt yet.
@Injectable()
export class BalancesService {
  constructor(
    @InjectRepository(Charge) private readonly chargesRepo: Repository<Charge>,
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    private readonly childrenService: ChildrenService,
  ) {}

  async getBalance(childId: string): Promise<Balance> {
    const chargedRow = await this.chargesRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'sum')
      .where('c.child_id = :childId', { childId })
      .andWhere('c.due_date <= CURRENT_DATE')
      .getRawOne<{ sum: string }>();

    const paidRow = await this.paymentsRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.child_id = :childId', { childId })
      .getRawOne<{ sum: string }>();

    const charged = Number(chargedRow?.sum ?? 0);
    const paid = Number(paidRow?.sum ?? 0);
    return { charged: charged.toFixed(2), paid: paid.toFixed(2), debt: (charged - paid).toFixed(2) };
  }

  async listDebtors(direction?: Direction): Promise<Array<{ childId: string; fullName: string } & Balance>> {
    const activeChildren = await this.childrenService.findAll({
      status: ChildStatus.ACTIVE,
      direction,
    } as QueryChildrenDto);
    const debtors: Array<{ childId: string; fullName: string } & Balance> = [];

    for (const child of activeChildren) {
      const balance = await this.getBalance(child.id);
      if (Number(balance.debt) > 0) {
        debtors.push({ childId: child.id, fullName: child.fullName, ...balance });
      }
    }

    return debtors;
  }
}
