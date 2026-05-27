import apiClient from './client';

export interface LoginRequest  { username: string; password: string }
export interface LoginResponse { token: string; role: string; gyogu: number; team: number; group_no: number }

export const login  = (body: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', body).then((r) => r.data);

export const logout = () => apiClient.post('/auth/logout').catch(() => null);
