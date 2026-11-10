import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfileDTO } from '@fitcore/shared-types';

interface AuthState {
  user: UserProfileDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (payload: {
    user: UserProfileDTO;
    accessToken: string;
    refreshToken: string;
  }) => void;
  updateUser: (user: UserProfileDTO) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      updateUser: (user) => set({ user }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'fitcore-auth-storage',
    }
  )
);

