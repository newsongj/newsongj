import axios from 'axios';

const BASE_URL = '';

export interface MemberApiRow {
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

interface MemberListResponse {
  items: MemberApiRow[];
  meta: {
    current_page: number;
    page_size: number;
    total_items: number;
  };
}

export async function fetchMembers(params: {
  page: number;
  page_size: number;
  year?: string;
  gyogu?: number;
  team?: number;
  group_no?: number;
  generation?: number;
}): Promise<MemberListResponse> {
  const res = await axios.get(`${BASE_URL}/api/v1/교적/members`, { params });
  return res.data;
}
