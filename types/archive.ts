import type { StationType, PricingMode, BillingMode, SessionStatus } from "./database";

export interface ArchiveShiftSession {
  id: string;
  station_id: string;
  mode: PricingMode;
  billing_mode: BillingMode;
  status: SessionStatus;
  start_time: string;
  end_time: string | null;
  games_count: number | null;
  calculated_cost: number | null;
  duration_hours: number | null;
  stations: { name: string; station_type: StationType } | null;
}

export interface ArchiveShiftSaleItem {
  id: string;
  session_id: string | null;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: { name: string } | null;
}

export interface ArchiveShiftExpenseRow {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  shifts: { responsible_name: string } | null;
}

export interface ArchiveShiftExpense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  responsible_name: string | null;
}

export interface ArchiveShiftRow {
  id: string;
  shift_number: number;
  opened_at: string;
  closed_at: string;
  status: string;
  responsible_name: string;
  opened_by_user_id: string | null;
  users: { display_name: string } | null;
  sessions: ArchiveShiftSession[];
  sale_items: ArchiveShiftSaleItem[];
  expenses?: ArchiveShiftExpenseRow[];
}

export interface ArchiveShift {
  id: string;
  shift_number: number;
  opened_at: string;
  closed_at: string;
  responsible_name: string;
  opened_by_user_name: string | null;
  sessions: ArchiveShiftSession[];
  sale_items: ArchiveShiftSaleItem[];
  expenses?: ArchiveShiftExpense[];
  total_revenue: number;
  expensesTotal?: number;
}

export interface DayWithShifts {
  date: string;
  shifts: ArchiveShift[];
}
