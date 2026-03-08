import { get, post, put, del } from './client';
import Cookies from 'js-cookie';
import { APP_CONFIG } from '@/constants/config';
import { 
  UserInfo, 
  UserResponse,
  UserCreateRequest,
  UserCreateResponse,
  UserUpdateRequest,
  UserUpdateResponse,
  UserDeleteResponse
} from '@/models/user.types';
import { Page } from '@/models/common.types';

export async function fetchUserInfo(): Promise<UserInfo> {
    const res = await get<UserInfo>(`${APP_CONFIG.api.prefix}/auth/me`);

    Cookies.set("email", res.email);

    return res;
}

/**
 * 사용자 목록 조회
 */
export async function fetchUsers(page: number = 1, pageSize: number = 20): Promise<Page<UserResponse>> {
  return get<Page<UserResponse>>('/api/v1/users', { page, pageSize });
}

/**
 * 사용자 검색
 */
export async function searchUsers(
  field?: string | null,
  keyword?: string | null,
  page: number = 1,
  pageSize: number = 20
): Promise<Page<UserResponse>> {
  return get<Page<UserResponse>>('/api/v1/users/search', { field, keyword, page, pageSize });
}

/**
 * 사용자 개별 조회
 */
export async function fetchUser(userId: number): Promise<UserResponse> {
  return get<UserResponse>(`/api/v1/users/${userId}`);
}

/**
 * 사용자 생성
 */
export async function createUser(userData: UserCreateRequest): Promise<UserCreateResponse> {
  return post<UserCreateResponse>('/api/v1/users', userData);
}

/**
 * 사용자 수정
 */
export async function updateUser(userId: number, userData: UserUpdateRequest): Promise<UserUpdateResponse> {
  return put<UserUpdateResponse>(`/api/v1/users/${userId}`, userData);
}

/**
 * 사용자 삭제
 */
export async function deleteUser(userIdx: number): Promise<UserDeleteResponse> {
  return del<UserDeleteResponse>(`/api/v1/users/${userIdx}?user_idx=${userIdx}`);
}
