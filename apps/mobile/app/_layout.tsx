import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { registerForPushNotificationsAsync } from '../src/lib/notifications';
import { useOfflineSyncStore } from '../src/lib/offlineSync';
import { useMobileAuthStore } from '../src/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const hydrate = useMobileAuthStore((s) => s.hydrate);
  const accessToken = useMobileAuthStore((s) => s.accessToken);
  const loadQueue = useOfflineSyncStore((s) => s.loadQueue);
  const syncQueue = useOfflineSyncStore((s) => s.syncQueue);

  useEffect(() => {
    void hydrate();
    void loadQueue();
  }, [hydrate, loadQueue]);

  useEffect(() => {
    if (!accessToken) return;
    void registerForPushNotificationsAsync();
    void syncQueue();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncQueue();
      }
    });
    return () => sub.remove();
  }, [accessToken, syncQueue]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#101112' },
        }}
      />
    </QueryClientProvider>
  );
}
