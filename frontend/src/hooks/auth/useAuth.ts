import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { setAccessToken, getAccessToken, removeAccessToken } from '@/utils/auth';
import { authState, userPermissionsState } from '@/recoil/auth/atoms';
import { getMe, localLogin, changePassword as changePasswordApi, logout as logoutApi } from '@/api/auth.ts';
import { LoginRequest, LoginResponse, PasswordChangeRequest, MeResponse } from '@/models/auth.types';
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

    setAuth({
      isAuthenticated: true,
      user: offlineUser,
      isLoading: false,
    });
    setPermissions(offlinePermissions);

    return offlineUser;
  }, [setAuth, setPermissions]);

  const setAuthStatus = useCallback(
    async (accessToken: string): Promise<boolean> => {
      if (!isBackendEnabled) {
        applyOfflineAuth();
        return true;
      }

      try {
        setAccessToken(accessToken);

        const userInfo = await getMe();
        const menuCodes = userInfo.menus.map(menu => menu.code);

        setAuth({
          isAuthenticated: true,
          user: userInfo,
          isLoading: false,
        });

        setPermissions(menuCodes);

        return true;
      } catch (error) {
        return false;
      }
    }, [setAuth, setPermissions, isBackendEnabled, applyOfflineAuth]);

  const checkAuthStatus = useCallback(async () => {
    if (!isBackendEnabled) {
      return applyOfflineAuth();
    }

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
    } catch (error) {
      removeAccessToken();
      setAuth({ isAuthenticated: false, user: null, isLoading: false });
      setPermissions([]);
      return null;
    }
  }, [setAuth, setPermissions, isBackendEnabled, isBypassAuth, applyOfflineAuth]);

  const login = useCallback(async (loginRequest: LoginRequest) => {
    if (!isBackendEnabled) {
      const loginResponse: LoginResponse = {
        access_token: 'offline-token',
        token_type: 'bearer',
        requires_password_change: false,
      };
      setAccessToken(loginResponse.access_token);
      return loginResponse;
    }

    const loginResponse: LoginResponse = await localLogin(loginRequest);
    setAccessToken(loginResponse.access_token);
    return loginResponse;
  }, [setAuth, setPermissions, isBackendEnabled]);

  const changePassword = useCallback(async (passwordData: PasswordChangeRequest) => {
    if (!isBackendEnabled) {
      return {
        success: true,
        message: 'Backend integration is disabled.',
      };
    }

    const response: CommonResponse = await changePasswordApi(passwordData);
    return response;
  }, [isBackendEnabled]);

  const logout = useCallback(async () => {
    try {
      if (isBackendEnabled) {
        await logoutApi();
      }
    } catch {
      // 로그아웃 API 실패해도 클라이언트 정리는 반드시 진행
    } finally {
      removeAccessToken();
      setAuth({ isAuthenticated: false, user: null, isLoading: false });
      setPermissions([]);
      window.location.href = '/admin/login';
    }
  }, [setAuth, setPermissions, isBackendEnabled]);

  return {
    auth,
    permissions,
    checkAuthStatus,
    login,
    setAuthStatus,
    changePassword,
    logout,
  };
};
