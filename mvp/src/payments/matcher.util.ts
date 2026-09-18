import { Child } from '../children/child.entity';
import { nameSimilarity } from '../common/name-match.util';
import { extractPeriodFromText } from '../common/parse-helpers.util';
import { ConfidenceTier, PeriodSource } from './payment-match.entity';

export interface MatchInput {
  amount: number;
  payerName: string;
  purpose: string | null;
  date: string;
}

export interface MatchReason {
  label: string;
  score: number;
}

export interface MatchResult {
  childId: string | null;
  score: number;
  tier: ConfidenceTier;
  reasons: MatchReason[];
  periodYearMonth: string | null;
  periodSource: PeriodSource;
}

// ТЗ раздел 7-8: несколько признаков (ФИО, сумма, назначение), общий
// confidence score, без требования идеального совпадения строки.
// >=90 зелёный (авто), 65-89 жёлтый (на проверку), <65 красный (на
// проверку, без автоматического зачёта).
export function matchTransaction(tx: MatchInput, children: Child[]): MatchResult {
  const period = resolvePeriod(tx);

  if (children.length === 0) {
    return { childId: null, score: 0, tier: ConfidenceTier.RED, reasons: [], ...period };
  }

  let best: { child: Child; score: number; nameScore: number; amountScore: number } | null = null;

  for (const child of children) {
    const nameFromPayer = nameSimilarity(tx.payerName, child.fullName);
    const nameFromPurpose = tx.purpose ? nameSimilarity(tx.purpose, child.fullName) : 0;
    const nameFromParent = child.parentName ? nameSimilarity(tx.payerName, child.parentName) : 0;
    const nameScore = Math.max(nameFromPayer, nameFromPurpose, nameFromParent);

    const amountScore = scoreAmount(tx.amount, Number(child.monthlyFee));
    const composite = Math.round(nameScore * 0.6 + amountScore * 0.4);

    if (!best || composite > best.score) {
      best = { child, score: composite, nameScore, amountScore };
    }
  }

  if (!best) return { childId: null, score: 0, tier: ConfidenceTier.RED, reasons: [], ...period };

  const reasons: MatchReason[] = [
    { label: 'Совпадение ФИО', score: best.nameScore },
    { label: 'Совпадение суммы', score: best.amountScore },
  ];

  return {
    childId: best.score >= 40 ? best.child.id : null,
    score: best.score,
    tier: tierFor(best.score),
    reasons,
    ...period,
  };
}

function scoreAmount(paid: number, expected: number): number {
  if (!expected || expected <= 0) return 0;
  const diff = Math.abs(paid - expected) / expected;
  if (diff < 0.01) return 100;
  if (diff < 0.05) return 80;
  if (diff < 0.15) return 50;
  return 0;
}

function tierFor(score: number): ConfidenceTier {
  if (score >= 90) return ConfidenceTier.GREEN;
  if (score >= 65) return ConfidenceTier.YELLOW;
  return ConfidenceTier.RED;
}

function resolvePeriod(tx: MatchInput): { periodYearMonth: string | null; periodSource: PeriodSource } {
  const txDate = new Date(tx.date);
  const fallbackYear = Number.isFinite(txDate.getFullYear()) ? txDate.getFullYear() : new Date().getFullYear();

  if (tx.purpose) {
    const fromPurpose = extractPeriodFromText(tx.purpose, fallbackYear);
    if (fromPurpose) return { periodYearMonth: fromPurpose, periodSource: PeriodSource.PURPOSE_TEXT };
  }

  if (!Number.isNaN(txDate.getTime())) {
    const period = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    return { periodYearMonth: period, periodSource: PeriodSource.TRANSACTION_DATE };
  }

  return { periodYearMonth: null, periodSource: PeriodSource.UNKNOWN };
}
