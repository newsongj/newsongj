import Cookies from 'js-cookie';

const TOKEN_KEY = 'access_token';

/**
 * 액세스 토큰 저장
 */
export const setAccessToken = (token: string): void => {
  Cookies.set(TOKEN_KEY, token, {
    expires: 1, // 24시간 후 만료 (JWT와 동일)
    secure: false, // TODO: HTTP 임시 허용 (운영 HTTPS 전환 시 아래 라인으로 복구)
    // secure: process.env.NODE_ENV === 'production',
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
