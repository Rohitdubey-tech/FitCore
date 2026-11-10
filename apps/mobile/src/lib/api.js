import axios from 'axios';
import { useMobileAuthStore } from '../store/authStore';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1';
export const mobileApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});
mobileApi.interceptors.request.use((config) => {
    const token = useMobileAuthStore.getState().accessToken;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
mobileApi.interceptors.response.use((response) => response, async (error) => {
    const original = error.config;
    if (error.response?.status === 401 &&
        original &&
        !original._retry &&
        !original.url?.includes('/auth/login') &&
        !original.url?.includes('/auth/refresh')) {
        original._retry = true;
        const { refreshToken, setSession, clearSession } = useMobileAuthStore.getState();
        if (!refreshToken) {
            await clearSession();
            return Promise.reject(error);
        }
        try {
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            const { user, tokens } = res.data.data;
            await setSession({
                user,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
            if (original.headers) {
                original.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
            return mobileApi(original);
        }
        catch (refreshErr) {
            await clearSession();
            return Promise.reject(refreshErr);
        }
    }
    return Promise.reject(error);
});
