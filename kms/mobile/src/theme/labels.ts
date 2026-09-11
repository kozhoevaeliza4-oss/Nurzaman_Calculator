export const ROLE_LABELS: Record<string, string> = {
  director: 'Директор',
  admin: 'Администратор',
  accountant: 'Бухгалтер',
  teacher: 'Воспитатель',
  medic: 'Медработник',
  parent: 'Родитель',
};

export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  snack: 'Полдник',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  left: 'Выбыл',
  academic_leave: 'Академ. отпуск',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  birth_certificate: 'Свидетельство о рождении',
  medical_clearance: 'Медицинская справка',
  contract: 'Договор',
  other: 'Другое',
};

export const CHARGE_TYPE_LABELS: Record<string, string> = {
  monthly_tariff: 'Ежемесячный тариф',
  one_time: 'Разовое начисление',
  discount: 'Скидка',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_qr: 'QR-оплата',
  cash: 'Наличные',
  bank_transfer: 'Банковский перевод',
};

export const RELATION_LABELS: Record<string, string> = {
  mother: 'Мать',
  father: 'Отец',
  guardian: 'Опекун',
  other: 'Другое',
};

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU');
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
