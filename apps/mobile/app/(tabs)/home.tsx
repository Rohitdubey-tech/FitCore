import { useQuery } from '@tanstack/react-query';
import type {
  ApiSuccessResponse,
  SubscriptionDTO,
  UserProfileDTO,
  WorkoutSessionDTO,
  WorkoutStatsDTO,
} from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgePill, FitButton, FitCard, ScreenContainer } from '../../src/components/ui';
import { mobileApi } from '../../src/lib/api';
import { useOfflineSyncStore } from '../../src/lib/offlineSync';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const queuedCount = useOfflineSyncStore((s) => s.queue.length);
  const syncQueue = useOfflineSyncStore((s) => s.syncQueue);

  const meQuery = useQuery({
    queryKey: ['mobile', 'me'],
    queryFn: async () => {
      const res = await mobileApi.get<ApiSuccessResponse<{ user: UserProfileDTO }>>('/auth/me');
      return res.data.data.user;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['mobile', 'workout-stats'],
    queryFn: async () => {
      const res = await mobileApi.get<
        ApiSuccessResponse<{ sessions: WorkoutSessionDTO[]; stats: WorkoutStatsDTO }>
      >('/workout-sessions/history');
      return res.data.data;
    },
  });

  const subsQuery = useQuery({
    queryKey: ['mobile', 'subscriptions'],
    queryFn: async () => {
      const res = await mobileApi.get<ApiSuccessResponse<{ subscriptions: SubscriptionDTO[] }>>(
        '/subscriptions'
      );
      return res.data.data.subscriptions;
    },
  });

  const user = meQuery.data;
  const stats = statsQuery.data?.stats;
  const activeSub = subsQuery.data?.[0];

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brand}>FITCORE</Text>
          <Text style={styles.title}>
            {user ? `Hi, ${user.firstName}` : 'Loading dashboard...'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} style={styles.notifBtn}>
          <Text style={{ color: FITCORE_THEME.primaryAccent, fontSize: 12, fontWeight: '700' }}>
            Alerts
          </Text>
        </Pressable>
      </View>

      {queuedCount > 0 && (
        <FitCard style={{ borderColor: FITCORE_THEME.primaryAccent }}>
          <Text style={styles.cardTitle}>{queuedCount} offline workout(s) pending sync</Text>
          <Text style={styles.cardSub}>Tap below to upload queued sessions to your account.</Text>
          <View style={{ marginTop: 10 }}>
            <FitButton label="Sync Now" onPress={() => void syncQueue()} />
          </View>
        </FitCard>
      )}

      <View style={styles.kpiGrid}>
        <FitCard style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Workout Streak</Text>
          <Text style={styles.kpiAccent}>{stats?.currentStreakDays ?? 0} days</Text>
        </FitCard>
        <FitCard style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total PRs</Text>
          <Text style={styles.kpiValue}>{stats?.totalPersonalRecords ?? 0}</Text>
        </FitCard>
      </View>

      <FitCard>
        <BadgePill label="MEMBERSHIP STATUS" accent />
        <Text style={[styles.cardTitle, { marginTop: 10 }]}>
          {activeSub?.plan?.name || 'No active gym plan'}
        </Text>
        <Text style={styles.cardSub}>
          {activeSub
            ? `Status: ${activeSub.status} · Valid until ${new Date(
                activeSub.endDate
              ).toLocaleDateString()}`
            : 'View membership details or payment history.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <FitButton
              label="Membership"
              variant="secondary"
              onPress={() => router.push('/membership')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FitButton
              label="Payments"
              variant="secondary"
              onPress={() => router.push('/payments')}
            />
          </View>
        </View>
      </FitCard>

      <FitCard>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          <FitButton label="Start / Log Workout" onPress={() => router.push('/(tabs)/workouts')} />
          <FitButton
            label="Workout History"
            variant="secondary"
            onPress={() => router.push('/workout-history')}
          />
          <FitButton
            label="AI Diet Planner"
            variant="secondary"
            onPress={() => router.push('/ai-diet')}
          />
        </View>
      </FitCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { color: FITCORE_THEME.primaryAccent, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: FITCORE_THEME.primaryText, fontSize: 26, fontWeight: '800', marginTop: 4 },
  notifBtn: {
    borderWidth: 1,
    borderColor: FITCORE_THEME.border,
    backgroundColor: FITCORE_THEME.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  kpiGrid: { flexDirection: 'row', gap: 12 },
  kpiCard: { flex: 1 },
  kpiLabel: { color: FITCORE_THEME.secondaryText, fontSize: 12 },
  kpiAccent: { color: FITCORE_THEME.primaryAccent, fontSize: 24, fontWeight: '800', marginTop: 6 },
  kpiValue: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 6 },
  cardTitle: { color: FITCORE_THEME.primaryText, fontSize: 16, fontWeight: '700' },
  cardSub: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 4 },
});

