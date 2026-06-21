import apiClient from './client';
import { AuthUser } from '../models/auth.types';

export interface LoginRequest  { login_id: string; password: string }
export interface MemberLoginRequest { phone: string; name: string }
export type   LoginResponse = AuthUser;

export const login  = (body: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', body).then((r) => r.data);

export const memberLogin = (body: MemberLoginRequest) =>
    apiClient.post<LoginResponse>('/auth/member-login', body).then((r) => r.data);

export const logout = () => apiClient.post('/auth/logout').catch(() => null);
