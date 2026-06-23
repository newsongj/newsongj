import { get, post, put } from './client.ts';
import {
  LoginRequest,
  LoginResponse,
  MeResponse,
  LogoutResponse,
  PasswordChangeRequest,
  AdminLoginResponse,
} from '@/models/auth.types';
import { CommonResponse } from '@/models/common.types';

export async function adminLogin(loginData: LoginRequest): Promise<AdminLoginResponse> {
  return post<AdminLoginResponse>('/api/auth/login', loginData);
}

export async function getMe(): Promise<MeResponse> {
  return get<MeResponse>('/api/v1/me');
}

export async function logout(): Promise<LogoutResponse> {
  return post<LogoutResponse>('/api/v1/logout');
}

export async function checkAuth(): Promise<any> {
  return get<any>('/api/v1/auth/check');
}

export async function changePassword(passwordData: PasswordChangeRequest): Promise<CommonResponse> {
  return put<CommonResponse>('/api/v1/password', passwordData);
}
