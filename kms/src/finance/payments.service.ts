import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Receipt } from './receipt.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ChildrenService } from '../children/children.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Direction } from '../common/direction.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Receipt) private readonly receiptsRepo: Repository<Receipt>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly childrenService: ChildrenService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findForChild(childId: string): Promise<Payment[]> {
    return this.paymentsRepo.find({ where: { childId }, order: { paidAt: 'DESC' } });
  }

  // Module 3: "Приём оплат ... Формирование приходных документов и чеков
  // по каждой оплате." Payment + receipt are created together so a
  // recorded payment always has a receipt.
  async create(dto: CreatePaymentDto, recordedBy: string | null): Promise<{ payment: Payment; receipt: Receipt }> {
    await this.childrenService.findOne(dto.childId);

    const result = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.save(
        manager.create(Payment, {
          childId: dto.childId,
          amount: dto.amount,
          method: dto.method,
          paidAt: dto.paidAt,
          note: dto.note ?? null,
          recordedBy,
        }),
      );

      const sequenceResult: Array<{ nextval: string }> = await manager.query(
        `SELECT nextval('receipt_number_seq') AS nextval`,
      );
      const nextval = sequenceResult[0].nextval;

      const receipt = await manager.save(
        manager.create(Receipt, {
          receiptNumber: nextval,
          paymentId: payment.id,
          childId: payment.childId,
          amount: payment.amount,
          issuedAt: new Date(),
        }),
      );

      return { payment, receipt };
    });

    // Module 9 scenario: "начисление/оплата". Fired after the transaction
    // commits, never blocking or failing the payment itself.
    this.notifyOfPayment(dto.childId, dto.amount);

    return result;
  }

  private async notifyOfPayment(childId: string, amount: string): Promise<void> {
    await this.notificationsService
      .notifyParentsOfChild(childId, `Оплата получена: ${amount} сом. Спасибо!`, 'payment')
      .catch(() => undefined);
  }

  async getReceipt(paymentId: string): Promise<Receipt> {
    const receipt = await this.receiptsRepo.findOne({ where: { paymentId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }

  // Module 8: "Доходы ... в реальном времени." — total payments received
  // in [from, to].
  async totalForRange(from: string, to: string, direction?: Direction): Promise<string> {
    const qb = this.paymentsRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.paid_at >= :from AND p.paid_at <= :to', { from, to });
    if (direction) {
      qb.innerJoin('children', 'c', 'c.id = p.child_id').andWhere('c.direction = :direction', { direction });
    }
    const row = await qb.getRawOne<{ sum: string }>();
    return Number(row?.sum ?? 0).toFixed(2);
  }

  // Module 4 (1C sync): payments not yet confirmed reconciled by 1C.
  findUnreconciled(): Promise<Payment[]> {
    return this.paymentsRepo.find({ where: { reconciledAt: IsNull() }, order: { paidAt: 'ASC' } });
  }

  async markReconciled(paymentId: string, oneCDocumentId: string): Promise<Payment> {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    payment.reconciledAt = new Date();
    payment.oneCDocumentId = oneCDocumentId;
    return this.paymentsRepo.save(payment);
  }

  // Module 12: aggregated (not per-child) monthly totals for the last N
  // months, oldest first — the input to the payments forecast.
  async monthlyTotals(months: number): Promise<Array<{ month: string; total: string }>> {
    const rows = await this.paymentsRepo
      .createQueryBuilder('p')
      .select("to_char(p.paid_at, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'total')
      .where(`p.paid_at >= (CURRENT_DATE - INTERVAL '${months} months')`)
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; total: string }>();
    return rows.map((r) => ({ month: r.month, total: Number(r.total).toFixed(2) }));
  }
}
