import Cookies from 'js-cookie';

const TOKEN_KEY = 'client_token';

export const storage = {
    getToken: () => Cookies.get(TOKEN_KEY) ?? null,
    setToken: (token: string) => Cookies.set(TOKEN_KEY, token, { expires: 1 }),
    removeToken: () => Cookies.remove(TOKEN_KEY),
};
