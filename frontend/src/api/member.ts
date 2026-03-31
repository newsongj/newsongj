import { get, post, put, del } from '@/api/client';
import { MemberRow, DeletedMemberRow } from '@/models/member.types';
import { Page } from '@/models/common.types';

export interface MemberCreateBody {
  name: string;
  gender: string;
  generation: number;
  phone_number?: string;
  birthdate?: string;
  gyogu?: number;
  team?: number;
  group_no?: number;
  leader_ids?: string;
  member_type?: string;
  attendance_grade?: string;
  plt_status?: string;
  v8pid?: string;
  school_work?: string;
  major?: string;
}

/** 활성 멤버 목록 조회 */
export async function fetchMembers(params: {
  year: number;
  page: number;
  page_size: number;
  gyogu?: number;
  team?: number;
  group_no?: number;
  generation?: number;
  field?: string;
  keyword?: string;
}): Promise<Page<MemberRow>> {
  return get<Page<MemberRow>>('/api/v1/gyojeok/members', params);
}

/** 삭제된 멤버 목록 조회 */
export async function fetchDeletedMembers(params: {
  page: number;
  page_size: number;
  year?: number;
  gyogu?: number;
  team?: number;
  group_no?: number;
  generation?: number;
  deleted_from?: string;
  deleted_to?: string;
  field?: string;
  keyword?: string;
}): Promise<Page<DeletedMemberRow>> {
  return get<Page<DeletedMemberRow>>('/api/v1/gyojeok/members/deleted', params);
}

/** 삭제된 멤버 상세 조회 */
export async function fetchDeletedMember(memberId: number): Promise<DeletedMemberRow> {
  return get<DeletedMemberRow>(`/api/v1/gyojeok/members/deleted/${memberId}`);
}

/** 멤버 추가 */
export async function createMember(body: MemberCreateBody): Promise<MemberRow> {
  return post<MemberRow>('/api/v1/gyojeok/members', body);
}

/** 멤버 수정 */
export async function updateMember(memberId: number, body: MemberCreateBody): Promise<{ member_id: number }> {
  return put<{ member_id: number }>(`/api/v1/gyojeok/members/${memberId}`, body);
}

/** 멤버 소프트 삭제 */
export async function deleteMember(memberId: number, deletedReason: string): Promise<MemberRow> {
  return del<MemberRow>(`/api/v1/gyojeok/members/${memberId}`, { deleted_reason: deletedReason });
}

/** 삭제된 멤버 복원 */
export async function restoreMember(memberId: number): Promise<{ member_id: number }> {
  return post<{ member_id: number }>(`/api/v1/gyojeok/members/restore/${memberId}`);
}
