import { useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '@api/auth';
import { storage } from '@utils/storage';
import type { AuthUser } from '@models/auth.types';

const parseStoredUser = (): AuthUser | null => {
    try {
        const raw = localStorage.getItem('client_user');
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
        return null;
    }
};

export const useAuth = () => {
    const [user, setUser] = useState<AuthUser | null>(parseStoredUser);

    const login = useCallback(async (username: string, password: string) => {
        const data = await apiLogin({ username, password });
        const authUser: AuthUser = {
            token:    data.token,
            role:     data.role as AuthUser['role'],
            gyogu:    data.gyogu,
            team:     data.team,
            group_no: data.group_no,
        };
        storage.setToken(data.token);
        localStorage.setItem('client_user', JSON.stringify(authUser));
        setUser(authUser);
        return authUser;
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();
        storage.removeToken();
        localStorage.removeItem('client_user');
        setUser(null);
    }, []);

    return { user, login, logout, isLoggedIn: !!user };
};
