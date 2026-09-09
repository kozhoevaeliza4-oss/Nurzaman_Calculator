import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncLog, SyncDirection } from './sync-log.entity';
import { PaymentsService } from '../finance/payments.service';
import { ParentsService } from '../parents/parents.service';
import { ImportReconciliationDto } from './dto/import-reconciliation.dto';

// Module 4: "Двусторонняя синхронизация: оплаты, договоры, контрагенты,
// финансовые документы. Исключение двойного ввода данных." The exact 1C
// version/config is an open TZ question (section 8) — this is a
// protocol-agnostic pull/push shape (JSON export, JSON import for
// reconciliation confirmations) that a 1C-side integration (an
// обработка/обмен, or a middleware script) can adapt to whatever exchange
// format that version of 1C actually speaks.
@Injectable()
export class OneCService {
  constructor(
    @InjectRepository(SyncLog) private readonly syncLogRepo: Repository<SyncLog>,
    private readonly paymentsService: PaymentsService,
    private readonly parentsService: ParentsService,
  ) {}

  async exportPayments() {
    const payments = await this.paymentsService.findUnreconciled();
    await this.log(SyncDirection.EXPORT, 'payment', payments.length);
    return payments;
  }

  async exportContragents() {
    const parents = await this.parentsService.findAll();
    await this.log(SyncDirection.EXPORT, 'contragent', parents.length);
    return parents.map((p) => ({ id: p.id, fullName: p.fullName, phone: p.phone, email: p.email }));
  }

  async importReconciliation(dto: ImportReconciliationDto) {
    const results = await Promise.all(
      dto.items.map((item) => this.paymentsService.markReconciled(item.paymentId, item.oneCDocumentId)),
    );
    await this.log(SyncDirection.IMPORT, 'payment_reconciliation', results.length);
    return { reconciled: results.length };
  }

  private log(direction: SyncDirection, entityType: string, recordCount: number): Promise<SyncLog> {
    return this.syncLogRepo.save(this.syncLogRepo.create({ direction, entityType, recordCount }));
  }
}
