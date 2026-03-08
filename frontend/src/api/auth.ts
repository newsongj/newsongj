import { get, post, put } from './client.ts';
import {
  LoginRequest,
  LoginResponse,
  MeResponse,
  LogoutResponse,
  TicketExchangeRequest,
  PasswordChangeRequest
} from '@/models/auth.types';
import { CommonResponse } from '@/models/common.types';

/**
 * 관리자 페이지 로그인 (LOCAL 사용자만)
 */
export async function localLogin(loginData: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/api/v1/local/login', loginData);
}

/**
 * 현재 로그인한 사용자 정보 조회
 */
export async function getMe(): Promise<MeResponse> {
  return get<MeResponse>('/api/v1/me');
}

/**
 * 로그아웃
 */
export async function logout(): Promise<LogoutResponse> {
  return post<LogoutResponse>('/api/v1/logout');
}

/**
 * 인증 상태 확인
 */
export async function checkAuth(): Promise<any> {
  return get<any>('/api/v1/auth/check');
}

/**
 * 티켓-토큰 교환 (SSO)
 */
export async function exchangeTicket(ticketData: TicketExchangeRequest): Promise<any> {
  return post<any>('/api/v1/auth/exchange-ticket', ticketData);
}

/**
 * 로컬 로그인 비밀번호 변경
 * @param passwordData 
 * @returns 
 */
export async function changePassword(passwordData: PasswordChangeRequest): Promise<CommonResponse> {
  return put<CommonResponse>('/api/v1/password', passwordData);
}