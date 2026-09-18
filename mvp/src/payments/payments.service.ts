import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BankTransaction } from '../transactions/bank-transaction.entity';
import { PaymentMatch, MatchStatus, ConfidenceTier } from './payment-match.entity';
import { Child, ChildStatus } from '../children/child.entity';
import { ImportBatch, ImportBatchType } from '../imports/import-batch.entity';
import { parseBankStatement } from '../transactions/bank-statement-parser.util';
import { transactionFingerprint } from '../transactions/fingerprint.util';
import { matchTransaction } from './matcher.util';
import { parseAmount, parseDate } from '../common/parse-helpers.util';
import { TransactionRowDto } from './dto/import-transactions.dto';
import { ConfirmAction, ConfirmMatchDto } from './dto/confirm-match.dto';

export interface TransactionPreviewRow extends TransactionRowDto {
  rowIndex: number;
  isDuplicate: boolean;
  parsedAmount: number | null;
  parsedDate: string | null;
  suggestedChildId: string | null;
  suggestedChildName: string | null;
  score: number;
  tier: ConfidenceTier;
  reasons: Array<{ label: string; score: number }>;
  periodYearMonth: string | null;
  warnings: string[];
}

export interface ChildPaymentRow {
  childId: string;
  fullName: string;
  groupName: string | null;
  status: ChildStatus;
  expected: number;
  paid: number;
  remaining: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'overpaid';
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(BankTransaction) private readonly txRepo: Repository<BankTransaction>,
    @InjectRepository(PaymentMatch) private readonly matchRepo: Repository<PaymentMatch>,
    @InjectRepository(Child) private readonly childrenRepo: Repository<Child>,
    @InjectRepository(ImportBatch) private readonly batchRepo: Repository<ImportBatch>,
  ) {}

  // ---- Import: preview ----------------------------------------------------

  async previewImport(buffer: Buffer, filename: string): Promise<{ rows: TransactionPreviewRow[] }> {
    const rawRows = await parseBankStatement(buffer, filename);
    const children = await this.childrenRepo.find({ where: { status: ChildStatus.ACTIVE } });

    const rows: TransactionPreviewRow[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const warnings: string[] = [];
      const amount = parseAmount(raw.amount);
      const date = parseDate(raw.date);
      if (amount === null) warnings.push('Не удалось распознать сумму');
      if (!date) warnings.push('Не удалось распознать дату');
      if (!raw.payerName) warnings.push('Не найден плательщик');

      let isDuplicate = false;
      let match = { childId: null as string | null, score: 0, tier: ConfidenceTier.RED, reasons: [] as any[], periodYearMonth: null as string | null };

      if (amount !== null && date) {
        const fp = transactionFingerprint({
          date,
          amount,
          payerName: raw.payerName || '',
          transactionRef: raw.transactionRef || '',
        });
        const existing = await this.txRepo.findOne({ where: { fingerprint: fp } });
        isDuplicate = !!existing;

        if (!isDuplicate) {
          match = matchTransaction({ amount, payerName: raw.payerName || '', purpose: raw.purpose || null, date }, children);
        }
      }

      const child = match.childId ? children.find((c) => c.id === match.childId) : undefined;

      rows.push({
        ...raw,
        rowIndex: i,
        isDuplicate,
        parsedAmount: amount,
        parsedDate: date,
        suggestedChildId: match.childId,
        suggestedChildName: child?.fullName ?? null,
        score: match.score,
        tier: match.tier,
        reasons: match.reasons,
        periodYearMonth: match.periodYearMonth,
        warnings,
      });
    }

    return { rows };
  }

  // ---- Import: commit ------------------------------------------------------

  async commitImport(
    fileName: string,
    rows: TransactionRowDto[],
    uploadedBy: string | null,
  ): Promise<{ batchId: string; imported: number; autoConfirmed: number; needsReview: number; skippedDuplicates: number }> {
    const children = await this.childrenRepo.find({ where: { status: ChildStatus.ACTIVE } });
    let imported = 0;
    let autoConfirmed = 0;
    let needsReview = 0;
    let skippedDuplicates = 0;

    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        type: ImportBatchType.BANK_STATEMENT,
        fileName,
        totalRows: rows.length,
        uploadedBy,
      }),
    );

    for (const raw of rows) {
      const amount = parseAmount(raw.amount);
      const date = parseDate(raw.date);
      if (amount === null || !date || !raw.payerName) continue;

      const fp = transactionFingerprint({
        date,
        amount,
        payerName: raw.payerName,
        transactionRef: raw.transactionRef || '',
      });
      const existing = await this.txRepo.findOne({ where: { fingerprint: fp } });
      if (existing) {
        skippedDuplicates++;
        continue;
      }

      const tx = await this.txRepo.save(
        this.txRepo.create({
          date,
          amount: amount.toFixed(2),
          payerName: raw.payerName,
          purpose: raw.purpose || null,
          transactionRef: raw.transactionRef || null,
          fingerprint: fp,
          importBatchId: batch.id,
        }),
      );

      const match = matchTransaction({ amount, payerName: raw.payerName, purpose: raw.purpose || null, date }, children);
      const status = match.tier === ConfidenceTier.GREEN ? MatchStatus.AUTO_CONFIRMED : MatchStatus.NEEDS_REVIEW;

      await this.matchRepo.save(
        this.matchRepo.create({
          transactionId: tx.id,
          childId: match.childId,
          periodYearMonth: match.periodYearMonth,
          periodSource: match.periodSource,
          confidenceScore: match.score,
          confidenceTier: match.tier,
          confidenceReasons: match.reasons,
          status,
          confirmedBy: status === MatchStatus.AUTO_CONFIRMED ? 'система (авто)' : null,
          confirmedAt: status === MatchStatus.AUTO_CONFIRMED ? new Date() : null,
        }),
      );

      imported++;
      if (status === MatchStatus.AUTO_CONFIRMED) autoConfirmed++;
      else needsReview++;
    }

    batch.matchedRows = autoConfirmed;
    batch.needsReviewRows = needsReview;
    batch.skippedDuplicateRows = skippedDuplicates;
    await this.batchRepo.save(batch);

    return { batchId: batch.id, imported, autoConfirmed, needsReview, skippedDuplicates };
  }

  // ---- Manual confirmation (ТЗ раздел 17) ----------------------------------

  async listMatches(status?: MatchStatus) {
    const matches = await this.matchRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
    const txIds = matches.map((m) => m.transactionId);
    const transactions = txIds.length ? await this.txRepo.findBy({ id: In(txIds) }) : [];
    const txById = new Map(transactions.map((t) => [t.id, t]));
    const childIds = matches.map((m) => m.childId).filter((id): id is string => !!id);
    const children = childIds.length ? await this.childrenRepo.findBy({ id: In(childIds) }) : [];
    const childById = new Map(children.map((c) => [c.id, c]));

    return matches.map((m) => ({
      ...m,
      transaction: txById.get(m.transactionId) ?? null,
      childName: m.childId ? childById.get(m.childId)?.fullName ?? null : null,
    }));
  }

  async confirmMatch(matchId: string, dto: ConfirmMatchDto, confirmedBy: string) {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Операция не найдена');

    if (dto.action === ConfirmAction.NOT_A_PAYMENT) {
      match.status = MatchStatus.NOT_A_PAYMENT;
      match.childId = null;
    } else {
      match.status = MatchStatus.CONFIRMED;
      if (dto.childId) match.childId = dto.childId;
      if (dto.periodYearMonth) match.periodYearMonth = dto.periodYearMonth;
    }
    match.confirmedBy = confirmedBy;
    match.confirmedAt = new Date();
    return this.matchRepo.save(match);
  }

  // ---- Aggregation for the payments table / dashboard ----------------------

  async paymentsTable(period: string, groupName?: string): Promise<ChildPaymentRow[]> {
    const children = await this.childrenRepo.find({
      where: groupName ? { status: ChildStatus.ACTIVE, groupName } : { status: ChildStatus.ACTIVE },
      order: { fullName: 'ASC' },
    });

    const confirmedStatuses = [MatchStatus.AUTO_CONFIRMED, MatchStatus.CONFIRMED];
    const matches = await this.matchRepo.find({
      where: [
        { status: MatchStatus.AUTO_CONFIRMED, periodYearMonth: period },
        { status: MatchStatus.CONFIRMED, periodYearMonth: period },
      ],
    });
    const txIds = matches.map((m) => m.transactionId);
    const transactions = txIds.length ? await this.txRepo.findBy({ id: In(txIds) }) : [];
    const txById = new Map(transactions.map((t) => [t.id, t]));

    const paidByChild = new Map<string, number>();
    for (const m of matches) {
      if (!m.childId || !confirmedStatuses.includes(m.status)) continue;
      const tx = txById.get(m.transactionId);
      if (!tx) continue;
      paidByChild.set(m.childId, (paidByChild.get(m.childId) ?? 0) + Number(tx.amount));
    }

    return children.map((c) => {
      const expected = Number(c.monthlyFee);
      const paid = paidByChild.get(c.id) ?? 0;
      const remaining = Math.round((expected - paid) * 100) / 100;
      let paymentStatus: ChildPaymentRow['paymentStatus'] = 'unpaid';
      if (paid <= 0) paymentStatus = 'unpaid';
      else if (remaining > 0.01) paymentStatus = 'partial';
      else if (remaining < -0.01) paymentStatus = 'overpaid';
      else paymentStatus = 'paid';

      return {
        childId: c.id,
        fullName: c.fullName,
        groupName: c.groupName,
        status: c.status,
        expected,
        paid: Math.round(paid * 100) / 100,
        remaining,
        paymentStatus,
      };
    });
  }

  async debtors(period: string): Promise<ChildPaymentRow[]> {
    const table = await this.paymentsTable(period);
    return table.filter((r) => r.paymentStatus === 'unpaid' || r.paymentStatus === 'partial');
  }

  async bankOperations() {
    const transactions = await this.txRepo.find({ order: { date: 'DESC' } });
    const matches = await this.matchRepo.find();
    const matchByTx = new Map(matches.map((m) => [m.transactionId, m]));
    const childIds = matches.map((m) => m.childId).filter((id): id is string => !!id);
    const children = childIds.length ? await this.childrenRepo.findBy({ id: In(childIds) }) : [];
    const childById = new Map(children.map((c) => [c.id, c]));

    return transactions.map((tx) => {
      const match = matchByTx.get(tx.id);
      return {
        ...tx,
        match: match
          ? { status: match.status, tier: match.confidenceTier, childName: match.childId ? childById.get(match.childId)?.fullName ?? null : null }
          : null,
      };
    });
  }

  importHistory() {
    return this.batchRepo.find({ order: { createdAt: 'DESC' } });
  }
}
