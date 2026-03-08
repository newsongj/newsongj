import { atom } from 'recoil';
import { MeResponse } from '@/models/auth.types';

/**
 * 통합 인증 상태 (기존 구조 유지)
 */
export const authState = atom<{
  isAuthenticated: boolean;
  user: MeResponse | null;
  isLoading: boolean;
}>({
  key: 'authState',
  default: {
    isAuthenticated: false,
    user: null,
    isLoading: true,
  },
});

/**
 * 사용자 권한 상태 (메뉴 기반)
 */
export const userPermissionsState = atom<string[]>({
  key: 'userPermissionsState',
  default: [],
});
