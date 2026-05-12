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

export interface NewcomerBulkResponse {
  member_ids: number[];
  count: number;
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

export async function deleteNewcomer(memberId: number, deletedReason: string): Promise<{ member_id: number }> {
  return del<{ member_id: number }>(`/api/v1/gyojeok/members/newcomers/${memberId}`, {
    deleted_reason: deletedReason,
  });
}

export async function deleteNewcomers(memberIds: number[], deletedReason: string): Promise<NewcomerBulkResponse> {
  return del<NewcomerBulkResponse>('/api/v1/gyojeok/members/newcomers/bulk', {
    member_ids: memberIds,
    deleted_reason: deletedReason,
  });
}

export async function enrollNewcomer(memberId: number, body: NewcomerEnrollBody): Promise<{ member_id: number }> {
  return put<{ member_id: number }>(`/api/v1/gyojeok/members/${memberId}/enroll`, body);
}

export async function enrollNewcomers(memberIds: number[], body: NewcomerEnrollBody): Promise<NewcomerBulkResponse> {
  return put<NewcomerBulkResponse>('/api/v1/gyojeok/members/newcomers/bulk/enroll', {
    member_ids: memberIds,
    ...body,
  });
}
