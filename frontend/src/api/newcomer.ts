import { del, get, post, put } from '@/api/client';
import { Page } from '@/models/common.types';
import { MemberRow } from '@/models/member.types';

export interface NewcomerBody {
  name: string;
  gender: string;
  generation: number;
  phone_number?: string;
  birthdate?: string;
  v8pid?: string;
  school_work?: string;
  major?: string;
  gyogu: number;
  team: number;
  group_no: number;
}

export interface NewcomerEnrollBody {
  enrolled_at: string;
  member_type?: string;
}

export async function fetchNewcomers(params: {
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
  return get<Page<MemberRow>>('/api/v1/gyojeok/members/newcomers', params);
}

export async function createNewcomer(body: NewcomerBody): Promise<{ member_id: number }> {
  return post<{ member_id: number }>('/api/v1/gyojeok/members/newcomers', body);
}

export async function updateNewcomer(memberId: number, body: NewcomerBody): Promise<{ member_id: number }> {
  return put<{ member_id: number }>(`/api/v1/gyojeok/members/newcomers/${memberId}`, body);
}

export async function deleteNewcomer(memberId: number): Promise<{ member_id: number }> {
  return del<{ member_id: number }>(`/api/v1/gyojeok/members/newcomers/${memberId}`);
}

export async function enrollNewcomer(memberId: number, body: NewcomerEnrollBody): Promise<{ member_id: number }> {
  return put<{ member_id: number }>(`/api/v1/gyojeok/members/${memberId}/enroll`, body);
}
