import Cookies from 'js-cookie';

const TOKEN_KEY = 'access_token';

/**
 * 액세스 토큰 저장
 */
export const setAccessToken = (token: string): void => {
  Cookies.set(TOKEN_KEY, token, { 
    expires: 1/24, // 1시간 후 만료 (1일의 1/24)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

/**
 * 액세스 토큰 조회
 */
export const getAccessToken = (): string | undefined => {
  return Cookies.get(TOKEN_KEY);
};

/**
 * 액세스 토큰 삭제 (로그아웃)
 */
export const removeAccessToken = (): void => {
  Cookies.remove(TOKEN_KEY);
};

/**
 * 인증 상태 확인
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};
