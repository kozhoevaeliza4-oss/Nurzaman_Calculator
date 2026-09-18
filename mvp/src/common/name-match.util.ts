// Shared by the children import (dedupe) and the bank-statement matcher
// (module 7 of the ТЗ: "не нужно требовать идеального совпадения строки").
// Handles the exact case from the spec: "Алина Исмаилова" vs "ИСМАИЛОВА
// АЛИНА" - different case, different word order.

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nameTokens(raw: string): string[] {
  return normalizeName(raw)
    .split(' ')
    .filter((t) => t.length > 0);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

// 0-100. Order-independent (token best-match), tolerant of typos and
// abbreviated tokens ("А." vs "Алина" still gets partial credit via
// Levenshtein against the truncated form, though a full token beats it).
export function nameSimilarity(a: string, b: string): number {
  const tokensA = nameTokens(a);
  const tokensB = nameTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  let sum = 0;
  for (const tok of shorter) {
    let best = 0;
    for (const other of longer) {
      best = Math.max(best, tokenSimilarity(tok, other));
    }
    sum += best;
  }
  return Math.round((sum / shorter.length) * 100);
}
