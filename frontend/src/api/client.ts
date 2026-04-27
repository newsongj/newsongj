import axios, { AxiosRequestConfig } from 'axios';
import { getAccessToken, removeAccessToken } from '@/utils/auth';
import { APP_CONFIG } from '@/constants/config';

const client = axios.create({
  baseURL: APP_CONFIG.api.url,
});

const ensureBackendEnabled = (): void => {
  if (!APP_CONFIG.backend.enabled) {
    throw new Error('Backend integration is disabled. Skipping HTTP request.');
  }
};

// 요청 인터셉터: 모든 요청에 인증 토큰을 자동으로 추가합니다.
client.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      // Bearer 토큰 형식으로 Authorization 헤더에 추가합니다.
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // 요청 에러 처리
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 응답을 처리합니다.
client.interceptors.response.use(
  (response) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      // 로그인 엔드포인트의 401은 "잘못된 비밀번호"이므로 호출부로 그대로 전달
      if (error.config?.url?.includes('/local/login')) {
        return Promise.reject(error);
      }
      removeAccessToken();
      alert('세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.');
      window.location.href = '/login';
      return Promise.reject(new Error('Unauthorized'));
    }

    if (error.response?.status === 400 && error.response?.data?.detail) {
      // 백엔드의 { "detail": string } 형식 에러를 처리
      const customError = new Error(error.response.data.detail);
      customError.name = 'APIError';
      return Promise.reject(customError);
    }
    return Promise.reject(error);
  }
);

// API 호출을 위한 헬퍼 함수들
export const get = async <T>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> => {
  ensureBackendEnabled();
  const response = await client.get<T>(url, { ...config, params });
  return response.data;
};

export const post = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  ensureBackendEnabled();
  const response = await client.post<T>(url, data, config);
  return response.data;
};

export const put = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  ensureBackendEnabled();
  const response = await client.put<T>(url, data, config);
  return response.data;
};

export const del = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  ensureBackendEnabled();
  const response = await client.delete<T>(url, { ...config, data });
  return response.data;
};

export default client;
