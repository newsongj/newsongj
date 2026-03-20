import { PageMeta } from '@/models/common.types';

export interface MemberRow {
  member_id: number;
  name: string;
  gender: string;
  generation: number;
  gyogu: number | null;
  team: number | null;
  group_no: number | null;
  phone_number: string | null;
  birthdate: string | null;
  member_type: string | null;
  attendance_grade: string | null;
  plt_status: string | null;
  leader: string | null;
  v8pid: string | null;
  year: string | null;
  enrolled_at: string | null;
}

export interface MemberFilterState {
  year: string;       // 표시 형식 "2026년" → API: "2026-01-01"
  gyogu: string;      // 표시 형식 "1교구" → API: 1
  team: string;       // 표시 형식 "1팀" → API: 1
  group_no: string;   // 표시 형식 "1그룹" → API: 1
  generation: string; // 표시 형식 "35기" → API: 35
}

export interface MembersState {
  items: MemberRow[];
  loading: boolean;
  pagination: PageMeta;
}
