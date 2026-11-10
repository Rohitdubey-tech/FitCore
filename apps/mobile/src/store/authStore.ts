import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { UserProfileDTO } from '@fitcore/shared-types';

const ACCESS_KEY = 'fitcore_access_token';
const REFRESH_KEY = 'fitcore_refresh_token';
const ONBOARDED_KEY = 'fitcore_has_onboarded';

interface MobileAuthState {
  user: UserProfileDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasOnboarded: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setOnboarded: () => Promise<void>;
  setSession: (payload: {
    user: UserProfileDTO;
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  updateUser: (user: UserProfileDTO) => void;
  clearSession: () => Promise<void>;
}

export const useMobileAuthStore = create<MobileAuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hasOnboarded: false,
  hydrated: false,
  hydrate: async () => {
    try {
      const [accessToken, refreshToken, onboardedFlag] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
        AsyncStorage.getItem(ONBOARDED_KEY),
      ]);
      set({
        accessToken,
        refreshToken,
        hasOnboarded: onboardedFlag === 'true',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  setOnboarded: async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    set({ hasOnboarded: true });
  },
  setSession: async ({ user, accessToken, refreshToken }) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
    set({ user, accessToken, refreshToken });
  },
  updateUser: (user) => set({ user }),
  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
