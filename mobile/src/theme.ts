// Same brand palette as the web frontend (kms/frontend/style.css).
export const colors = {
  bg: '#FDFBF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EFE7',
  ink: '#1B1610',
  inkMuted: '#756A5C',
  border: '#E9E0D3',
  accent: '#FF9100',
  accentInk: '#7A3E00',
  accentSoft: '#FFEAD0',
  success: '#2E8B57',
  successSoft: '#E4F3EA',
  warning: '#A3720A',
  warningSoft: '#FAF0D9',
  danger: '#B3402F',
  dangerSoft: '#FBE7E2',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const ROLE_LABELS: Record<string, string> = {
  director: 'Директор',
  admin: 'Администратор',
  accountant: 'Бухгалтер',
  teacher: 'Воспитатель',
  medic: 'Медработник',
  parent: 'Родитель',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  left: 'Выбыл',
  academic_leave: 'Академ. отпуск',
};

export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  snack: 'Полдник',
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

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  birth_certificate: 'Свидетельство о рождении',
  medical_clearance: 'Медицинская справка',
  contract: 'Договор',
  other: 'Другое',
};

export const RELATION_LABELS: Record<string, string> = {
  mother: 'Мать',
  father: 'Отец',
  guardian: 'Опекун',
  other: 'Другое',
};

export const STAFF_ROLES = ['director', 'admin', 'accountant', 'teacher', 'medic'];
export const FINANCE_ROLES = ['director', 'admin', 'accountant'];
export const DOCS_VIEW_ROLES = ['director', 'admin', 'teacher', 'medic'];
export const DOCS_EDIT_ROLES = ['director', 'admin'];
export const ATTENDANCE_VIEW_ROLES = ['director', 'admin', 'teacher', 'accountant', 'medic'];
export const ATTENDANCE_SCAN_ROLES = ['director', 'admin', 'teacher'];
export const MENU_EDIT_ROLES = ['director', 'admin', 'medic'];
export const EXPENSES_ROLES = ['director', 'admin', 'accountant'];
export const REPORTS_ROLES = ['director', 'admin', 'accountant'];
export const BROADCAST_ROLES = ['director', 'admin'];
export const CAN_MANAGE_ROLES = ['director', 'admin'];
