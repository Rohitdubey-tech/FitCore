import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse, UserProfileDTO } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { FitButton, FitCard, ScreenContainer } from '../../src/components/ui';
import { mobileApi } from '../../src/lib/api';
import { useOfflineSyncStore } from '../../src/lib/offlineSync';
import { useMobileAuthStore } from '../../src/store/authStore';

export default function MobileProfileScreen() {
  const router = useRouter();
  const clearSession = useMobileAuthStore((s) => s.clearSession);
  const { queue, syncQueue, isSyncing } = useOfflineSyncStore();

  const meQuery = useQuery({
    queryKey: ['mobile', 'me'],
    queryFn: async () => {
      const res = await mobileApi.get<ApiSuccessResponse<{ user: UserProfileDTO }>>('/auth/me');
      return res.data.data.user;
    },
  });

  const user = meQuery.data;

  const handleLogout = async () => {
    await clearSession();
    router.replace('/login');
  };

  return (
    <ScreenContainer>
      <Text style={styles.badge}>ACCOUNT & SETTINGS</Text>
      <Text style={styles.title}>
        {user ? `${user.firstName} ${user.lastName}` : 'Profile'}
      </Text>

      <FitCard>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.val}>{user?.email ?? '—'}</Text>
        <Text style={[styles.label, { marginTop: 12 }]}>Role</Text>
        <Text style={styles.val}>{user?.role ?? '—'}</Text>
      </FitCard>

      <FitCard>
        <Text style={styles.label}>Offline Workout Queue</Text>
        <Text style={styles.val}>{queue.length} pending session(s)</Text>
        <Text style={{ color: FITCORE_THEME.secondaryText, fontSize: 12, marginVertical: 8 }}>
          Queued workouts sync automatically when the app returns to foreground.
        </Text>
        <FitButton
          label={isSyncing ? 'Syncing...' : 'Sync Queued Workouts'}
          variant="secondary"
          onPress={() => void syncQueue()}
        />
      </FitCard>

      <FitButton label="Sign out" variant="danger" onPress={() => void handleLogout()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badge: { color: FITCORE_THEME.primaryAccent, fontSize: 12, fontWeight: '700' },
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  label: { color: FITCORE_THEME.secondaryText, fontSize: 12 },
  val: { color: FITCORE_THEME.primaryText, fontSize: 16, fontWeight: '600', marginTop: 2 },
});

