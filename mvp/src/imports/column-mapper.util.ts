// ТЗ раздел 24: "если в одном файле ФИО/Группа/Оплата, а в другом
// Ребёнок/Стоимость/Группа — система должна уметь распознать смысл
// колонок." Header names are matched against synonym lists rather than
// requiring an exact column name.

const CHILDREN_SYNONYMS: Record<string, string[]> = {
  fullName: ['фио', 'ребенок', 'ребёнок', 'имя', 'фамилия имя', 'ученик', 'воспитанник', 'name', 'child'],
  groupName: ['группа', 'класс', 'group', 'class'],
  monthlyFee: ['оплата', 'стоимость', 'сумма', 'тариф', 'платеж', 'платёж', 'fee', 'price', 'amount', 'оплата месяц', 'оплата/месяц'],
  status: ['статус', 'status', 'активность'],
  startDate: ['дата начала', 'дата зачисления', 'начало', 'start', 'зачислен'],
  endDate: ['дата окончания', 'окончание', 'end', 'выбыл'],
  parentName: ['родитель', 'мать', 'отец', 'опекун', 'parent'],
  parentPhone: ['телефон', 'номер', 'phone', 'тел'],
};

const BANK_SYNONYMS: Record<string, string[]> = {
  date: ['дата', 'date', 'дата операции', 'дата платежа'],
  amount: ['сумма', 'amount', 'приход', 'зачисление', 'сумма операции'],
  payerName: ['плательщик', 'отправитель', 'payer', 'фио плательщика', 'клиент', 'фио'],
  purpose: ['назначение', 'описание', 'комментарий', 'purpose', 'детали платежа', 'назначение платежа'],
  transactionRef: ['номер', 'id', 'референс', 'ref', 'номер операции', 'идентификатор', 'номер документа'],
};

const EXPENSE_SYNONYMS: Record<string, string[]> = {
  date: ['дата', 'date'],
  category: ['категория', 'статья', 'category'],
  amount: ['сумма', 'amount', 'стоимость'],
  description: ['описание', 'комментарий', 'назначение', 'description', 'note'],
  paymentMethod: ['способ оплаты', 'оплата', 'метод', 'method'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Returns, for each header index, the canonical field it best matches
// (or null if no synonym matched well enough).
export function mapHeaders(headers: string[], synonyms: Record<string, string[]>): (string | null)[] {
  return headers.map((raw) => {
    const h = normalizeHeader(raw);
    if (!h) return null;
    let bestField: string | null = null;
    let bestScore = 0;
    for (const [field, syns] of Object.entries(synonyms)) {
      for (const syn of syns) {
        const s = normalizeHeader(syn);
        let score = 0;
        if (h === s) score = 100;
        else if (h.includes(s) || s.includes(h)) score = 80;
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }
    return bestScore >= 70 ? bestField : null;
  });
}

export function mapChildrenHeaders(headers: string[]): (string | null)[] {
  return mapHeaders(headers, CHILDREN_SYNONYMS);
}

export function mapExpenseHeaders(headers: string[]): (string | null)[] {
  return mapHeaders(headers, EXPENSE_SYNONYMS);
}

export function mapBankHeaders(headers: string[]): (string | null)[] {
  return mapHeaders(headers, BANK_SYNONYMS);
}
