export type EmpfehlungStatus = "offen" | "erledigt" | "ausgezahlt";

export interface Handwerker {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  telefon: string | null;
  provision_prozent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Empfehlung {
  id: string;
  empfehler_name: string;
  empfehler_email: string;
  kunde_name: string;
  kunde_kontakt: string | null;
  handwerker_id: string;
  ref_code: string;
  status: EmpfehlungStatus;
  rechnungsbetrag: number | null;
  provision_betrag: number | null;
  ausgezahlt_am: string | null;
  iban: string | null;
  bic: string | null;
  kontoinhaber: string | null;
  bank_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmpfehlungWithHandwerker extends Empfehlung {
  handwerker: Pick<Handwerker, "id" | "name" | "email" | "telefon" | "provision_prozent">;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardStats {
  offen: number;
  erledigt: number;
  total_provision: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
