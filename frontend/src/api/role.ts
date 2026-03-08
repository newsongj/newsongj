import { get, post, put, del } from './client';
import {
  RoleListRow,
  RoleMenuResponse,
  RoleSelectedMenusResponse,
  RoleCreateRequest,
  RoleCreateResponse,
  RoleUpdateRequest,
  RoleUpdateResponse,
  RoleDeleteRequest,
  RoleDeleteResponse
} from '@/models/role.types';
import { Page } from '@/models/common.types';

/**
 * 권한 목록 조회
 */
export async function fetchRoles(page: number = 1, pageSize: number = 10): Promise<Page<RoleListRow>> {
  return get<Page<RoleListRow>>('/api/v1/roles', { page, pageSize });
}

/**
 * 권한 검색
 */
export async function searchRoles(
  field?: string | null,
  keyword?: string | null,
  page: number = 1,
  pageSize: number = 10
): Promise<Page<RoleListRow>> {
  return get<Page<RoleListRow>>('/api/v1/roles/search', { field, keyword, page, pageSize });
}

/**
 * 권한 메뉴 목록 조회
 */
export async function fetchRoleMenus(): Promise<RoleMenuResponse[]> {
  return get<RoleMenuResponse[]>('/api/v1/roles/menu');
}

/**
 * 권한 상세 조회
 */
export async function fetchRoleDetail(roleIdx: number): Promise<RoleSelectedMenusResponse> {
  return get<RoleSelectedMenusResponse>(`/api/v1/roles/${roleIdx}`);
}

/**
 * 신규 권한 생성
 */
export async function createRole(createData: RoleCreateRequest): Promise<RoleCreateResponse> {
  return post<RoleCreateResponse>('/api/v1/roles', createData);
}

/**
 * 권한 수정 (메뉴 접근 권한 및 활성화 상태)
 */
export async function updateRolePermissions(
  roleId: number,
  updateData: RoleUpdateRequest
): Promise<RoleUpdateResponse> {
  return put<RoleUpdateResponse>(`/api/v1/roles/${roleId}`, updateData);
}

/**
 * 권한 삭제
 */
export async function deleteRole(deleteData: RoleDeleteRequest): Promise<RoleDeleteResponse> {
  return del<RoleDeleteResponse>('/api/v1/roles', deleteData);
}
