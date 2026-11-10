import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuthStore = create()(persist((set) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    setSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
    updateUser: (user) => set({ user }),
    clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
}), {
    name: 'fitcore-auth-storage',
}));
