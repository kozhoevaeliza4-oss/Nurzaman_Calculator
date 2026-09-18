import { createHash } from 'crypto';
import { normalizeName } from '../common/name-match.util';

// ТЗ раздел 19: "если пользователь повторно загрузил ту же банковскую
// выписку — система НЕ должна повторно начислять платежи." Built from
// fields that together identify a specific transaction, so importing the
// same statement twice (or an overlapping date range) is a no-op for
// rows already seen.
export function transactionFingerprint(params: {
  date: string;
  amount: number;
  payerName: string;
  transactionRef: string;
}): string {
  const key = [
    params.date,
    params.amount.toFixed(2),
    normalizeName(params.payerName),
    params.transactionRef.trim().toLowerCase(),
  ].join('|');
  return createHash('sha256').update(key).digest('hex');
}
