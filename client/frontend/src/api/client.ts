import axios from 'axios';
import { storage } from '@utils/storage';

const apiClient = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
    const token = storage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

apiClient.interceptors.response.use(
    (res) => res,
    (error) => {
        const url = error.config?.url ?? '';
        const isLoginRequest = url === '/auth/login' || url === '/auth/member-login';
        if (error.response?.status === 401 && !isLoginRequest) {
            storage.removeToken();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
