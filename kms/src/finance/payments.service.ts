import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Receipt } from './receipt.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ChildrenService } from '../children/children.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Receipt) private readonly receiptsRepo: Repository<Receipt>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly childrenService: ChildrenService,
  ) {}

  findForChild(childId: string): Promise<Payment[]> {
    return this.paymentsRepo.find({ where: { childId }, order: { paidAt: 'DESC' } });
  }

  // Module 3: "Приём оплат ... Формирование приходных документов и чеков
  // по каждой оплате." Payment + receipt are created together so a
  // recorded payment always has a receipt.
  async create(dto: CreatePaymentDto, recordedBy: string | null): Promise<{ payment: Payment; receipt: Receipt }> {
    await this.childrenService.findOne(dto.childId);

    return this.dataSource.transaction(async (manager) => {
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
  }

  async getReceipt(paymentId: string): Promise<Receipt> {
    const receipt = await this.receiptsRepo.findOne({ where: { paymentId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }
}
