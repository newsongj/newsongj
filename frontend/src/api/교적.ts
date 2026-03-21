import { get } from '@/api/client';
import { MemberRow } from '@/models/교적.types';
import { Page } from '@/models/common.types';

/** 교적 멤버 목록 조회 */
export async function fetchMembers(params: {
  page: number;
  page_size: number;
  year?: string;
  gyogu?: number;
  team?: number;
  group_no?: number;
  generation?: number;
}): Promise<Page<MemberRow>> {
  return get<Page<MemberRow>>('/api/v1/교적/members', params);
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