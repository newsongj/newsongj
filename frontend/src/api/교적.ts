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

export interface AddMemberRequest {
  name: string;
  gender: string;
  generation: number;
  year?: string;
  gyogu?: number;
  team?: number;
  group_no?: number;
  phone_number?: string;
  birthdate?: string;
  member_type?: string;
  attendance_grade?: string;
  plt_status?: string;
  leader?: string;
  v8pid?: string;
}

export async function addMember(params: AddMemberRequest): Promise<MemberApiRow> {
  const res = await axios.post(`${BASE_URL}/api/v1/교적/members`, params);
  return res.data;
}

export interface UpdateMemberRequest {
  name?: string;
  gender?: string;
  generation?: number;
  year?: string;
  gyogu?: number;
  team?: number;
  group_no?: number;
  phone_number?: string;
  birthdate?: string;
  member_type?: string;
  attendance_grade?: string;
  plt_status?: string;
  leader?: string;
  v8pid?: string;
}

export async function updateMember(memberId: number, params: UpdateMemberRequest): Promise<MemberApiRow> {
  const res = await axios.put(`${BASE_URL}/api/v1/교적/members/${memberId}`, params);
  return res.data;
}

export interface DeleteMemberRequest {
  deleted_at: string;
  deleted_reason: string;
}

export async function deleteMember(memberId: number, body: DeleteMemberRequest): Promise<void> {
  await axios.delete(`${BASE_URL}/api/v1/교적/members/${memberId}`, { data: body });
}
