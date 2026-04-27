import { Page } from '@/models/common.types';

export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export type AbsentReason =
  | '학교/학원'
  | '회사'
  | '알바'
  | '가족모임'
  | '개인일정'
  | '아픔'
  | '기타';

export interface AttendanceMemberRow {
  member_id: number;
  name: string;
  generation: number;
  leader_names: string[];
  status: AttendanceStatus;
  absent_reason: AbsentReason | null;
}

export interface AttendanceRecordsParams {
  worship_date: string;
  gyogu_no: number;
  team_no?: number;
  group_no?: number;
  is_imwondan?: boolean;
  page: number;
  page_size: number;
}

export interface AttendanceRecordItem {
  member_id: number;
  status: AttendanceStatus;
  absent_reason: AbsentReason | null;
}

export interface AttendanceBatchRequest {
  worship_date: string;
  records: AttendanceRecordItem[];
}

export interface AttendanceBatchResponse {
  saved_count: number;
}

export type AttendancePageResponse = Page<AttendanceMemberRow>;

// ── Dashboard types ────────────────────────────────────────────────────────

export interface TrendItem {
  period: string;
  date: string;
  present: number;
}

export interface DimensionItem {
  name: string;
  present: number;
}

export interface AbsentReasonItem {
  reason: string;
  count: number;
}

export interface GyoguStatusItem {
  name: string;
  present: number;
  absent: number;
}

export type DashboardPeriodUnit = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface DashboardQuery {
  period_unit: DashboardPeriodUnit;
  date?: string;        // weekly: YYYY-MM-DD / monthly: YYYY-MM / yearly: YYYY
  start_date?: string;  // custom 전용
  end_date?: string;    // custom 전용
  gyogu_no?: number;
  team_no?: number;
  is_imwondan?: boolean;
}

export interface DashboardResponse {
  kpi: {
    all: { present: number; total: number };
    by_gen: { gen: number; present: number; total: number }[];
    top_reason: { reason: string; count: number } | null;
  };
  trend: TrendItem[];
  dimension: {
    gyogu?: DimensionItem[];
    team?: DimensionItem[];
    generation: DimensionItem[];
    gender: DimensionItem[];
    leader: DimensionItem[];
  };
  absent_reason: AbsentReasonItem[];
  gyogu_status: GyoguStatusItem[];
}
