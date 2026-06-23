import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { setAccessToken, getAccessToken, removeAccessToken } from '@/utils/auth';
import { authState, userPermissionsState } from '@/recoil/auth/atoms';
import { adminLogin, getMe, changePassword as changePasswordApi, logout as logoutApi } from '@/api/auth.ts';
import { LoginRequest, PasswordChangeRequest, MeResponse } from '@/models/auth.types';
import { CommonResponse } from '@/models/common.types';
import { APP_CONFIG } from '@/constants/config.ts';
import { MENU_CODES } from '@/constants/permissions';

export const useAuth = () => {
  const [auth, setAuth] = useRecoilState(authState);
  const [permissions, setPermissions] = useRecoilState(userPermissionsState);
  const isBackendEnabled = APP_CONFIG.backend.enabled;
  const isBypassAuth = APP_CONFIG.backend.bypassAuth;

  const applyOfflineAuth = useCallback((): MeResponse => {
    const offlinePermissions = [
      MENU_CODES.USER_MANAGEMENT,
      MENU_CODES.PERMISSION_MANAGEMENT,
      ...MENU_CODES.FILE_MANAGEMENT,
      MENU_CODES.DASHBOARD,
      MENU_CODES.COST_MONITORING_MANAGEMENT,
      MENU_CODES.COST_SETTINGS_MANAGEMENT,
    ];

    const offlineUser: MeResponse = {
      user_idx: 0,
      email: 'offline@local',
      name: 'Offline User',
      dept_idx: 0,
      roles: ['offline-admin'],
      menus: offlinePermissions.map((code, index) => ({
        menu_idx: index + 1,
        name: code,
        code,
        is_activated: true,
      })),
      requires_password_change: false,
    };

    setAuth({ isAuthenticated: true, user: offlineUser, isLoading: false });
    setPermissions(offlinePermissions);
    return offlineUser;
  }, [setAuth, setPermissions]);

  const checkAuthStatus = useCallback(async () => {
    if (!isBackendEnabled) return applyOfflineAuth();

    const accessToken = getAccessToken();
    if (!accessToken && isBypassAuth) return applyOfflineAuth();
    if (!accessToken) {
      setAuth({ isAuthenticated: false, user: null, isLoading: false });
      return null;
    }

    try {
      const userInfo = await getMe();
      const menuCodes = userInfo.menus.map(menu => menu.code);
      setAuth({ isAuthenticated: true, user: userInfo, isLoading: false });
      setPermissions(menuCodes);
      return userInfo;
    } catch {
      removeAccessToken();
      setAuth({ isAuthenticated: false, user: null, isLoading: false });
      setPermissions([]);
      return null;
    }
  }, [setAuth, setPermissions, isBackendEnabled, isBypassAuth, applyOfflineAuth]);

  const login = useCallback(async (loginRequest: LoginRequest) => {
    if (!isBackendEnabled) {
      setAccessToken('offline-token');
      return { access_token: 'offline-token', token_type: 'bearer', requires_password_change: false };
    }

    const response = await adminLogin(loginRequest);

    const adminMenus = response.menus.filter(m => m.startsWith('admin.'));
    if (adminMenus.length === 0) {
      throw new Error('관리자 페이지 접근 권한이 없습니다.');
    }

    setAccessToken(response.token);
    setPermissions(response.menus);

    const meResponse: MeResponse = {
      user_idx: 0,
      email: loginRequest.login_id,
      name: '관리자',
      roles: [],
      menus: response.menus.map((code, i) => ({ menu_idx: i, name: code, code, is_activated: true })),
      requires_password_change: response.requires_password_change,
    };
    setAuth({ isAuthenticated: true, user: meResponse, isLoading: false });

    return {
      access_token: response.token,
      token_type: 'bearer',
      requires_password_change: response.requires_password_change,
    };
  }, [setAuth, setPermissions, isBackendEnabled]);

  const changePassword = useCallback(async (passwordData: PasswordChangeRequest) => {
    if (!isBackendEnabled) return { success: true, message: 'Backend integration is disabled.' };
    const response: CommonResponse = await changePasswordApi(passwordData);
    return response;
  }, [isBackendEnabled]);

  const logout = useCallback(async () => {
    try {
      if (isBackendEnabled) await logoutApi();
    } catch {
      // 로그아웃 API 실패해도 클라이언트 정리 진행
    } finally {
      removeAccessToken();
      setAuth({ isAuthenticated: false, user: null, isLoading: false });
      setPermissions([]);
      window.location.href = '/admin/login';
    }
  }, [setAuth, setPermissions, isBackendEnabled]);

  return { auth, permissions, checkAuthStatus, login, changePassword, logout };
};
