import { get } from './client';
import { UserListRow, UserSearchRow } from '@/models/admin.types';
import { Page } from '@/models/common.types';

/**
 * 사용자 목록 조회
 */
export async function fetchUsers(page: number = 1, pageSize: number = 20): Promise<Page<UserListRow>> {
  return get<Page<UserListRow>>('/api/v1/users', { page, pageSize });
}

/**
 * 사용자 검색
 */
export async function searchUsers(
  field?: string | null,
  keyword?: string | null,
  page: number = 1,
  pageSize: number = 20
): Promise<Page<UserSearchRow>> {
  return get<Page<UserSearchRow>>('/api/v1/users/search', { field, keyword, page, pageSize });
}
