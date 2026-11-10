import axios from 'axios';
import { useAuthStore } from '../store/authStore';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
let isRefreshing = false;
let failedQueue = [];
function processQueue(error, token = null) {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        }
        else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
}
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/register') &&
        !originalRequest.url?.includes('/auth/refresh')) {
        const { refreshToken, setSession, clearSession } = useAuthStore.getState();
        if (!refreshToken) {
            clearSession();
            return Promise.reject(error);
        }
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: (newToken) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }
                        resolve(api(originalRequest));
                    },
                    reject,
                });
            });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            const { user, tokens } = res.data.data;
            setSession({
                user,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
            processQueue(null, tokens.accessToken);
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
            return api(originalRequest);
        }
        catch (refreshError) {
            processQueue(refreshError, null);
            clearSession();
            return Promise.reject(refreshError);
        }
        finally {
            isRefreshing = false;
        }
    }
    return Promise.reject(error);
});
export function getApiErrorMessage(err) {
    if (axios.isAxiosError(err)) {
        const apiErr = err.response?.data?.error;
        if (apiErr?.details && Array.isArray(apiErr.details) && apiErr.details.length > 0) {
            return apiErr.details.map((d) => d.message).join(', ');
        }
        return apiErr?.message || err.message || 'Request failed';
    }
    if (err instanceof Error)
        return err.message;
    return 'An unexpected error occurred';
}
