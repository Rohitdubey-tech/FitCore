import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
const ACCESS_KEY = 'fitcore_access_token';
const REFRESH_KEY = 'fitcore_refresh_token';
const ONBOARDED_KEY = 'fitcore_has_onboarded';
export const useMobileAuthStore = create((set) => ({
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
        }
        catch {
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
