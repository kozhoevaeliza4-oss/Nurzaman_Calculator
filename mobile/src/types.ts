export interface Group {
  id: string;
  name: string;
  capacity: number;
}

export interface Child {
  id: string;
  fullName: string;
  dateOfBirth: string;
  enrollmentDate: string;
  groupId: string | null;
  status: string;
  allergies: string[];
  qrCode: string;
}

export interface Parent {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  income: string;
  expenses: string;
  profit: string;
  debt: { total: string; debtorCount: number };
  attendance: { present: number; total: number };
  freeSpots: Array<{ groupId: string; freeSpots: number }>;
}

export interface Balance {
  charged: string;
  paid: string;
  debt: string;
}

export interface Charge {
  id: string;
  dueDate: string;
  type: string;
  amount: string;
  description: string | null;
}

export interface Payment {
  id: string;
  paidAt: string;
  method: string;
  amount: string;
}

export interface AttendanceRecord {
  id: string;
  eventType: 'check_in' | 'check_out';
  occurredAt: string;
}

export interface DocumentItem {
  id: string;
  fileName: string;
  type: string;
}

export interface MenuItem {
  id: string;
  date: string;
  mealType: string;
  dishName: string;
  allergens: string[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface PlanVsFactRow {
  categoryId: string;
  categoryName: string;
  planned: string;
  actual: string;
  deviation: string;
}

export interface Debtor {
  childId: string;
  fullName: string;
  charged: string;
  paid: string;
  debt: string;
}
