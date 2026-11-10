import { useQuery } from '@tanstack/react-query';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { BadgePill, FitButton, FitCard, ScreenContainer } from '../src/components/ui';
import { mobileApi } from '../src/lib/api';
export default function WorkoutHistoryScreen() {
    const router = useRouter();
    const query = useQuery({
        queryKey: ['mobile', 'workout-history'],
        queryFn: async () => {
            const res = await mobileApi.get('/workout-sessions/history');
            return res.data.data;
        },
    });
    const sessions = query.data?.sessions || [];
    return (<ScreenContainer>
      <FitButton label="← Back" variant="secondary" onPress={() => router.back()}/>
      <Text style={styles.title}>Workout History</Text>

      {sessions.length === 0 ? (<Text style={styles.sub}>No completed sessions yet.</Text>) : (sessions.map((s) => (<FitCard key={s.id}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.sub}>
              {new Date(s.startedAt).toLocaleDateString()} · {s.durationMinutes} min ·{' '}
              {s.totalVolumeKg.toLocaleString()} kg
            </Text>
            {s.personalRecordsHit > 0 && (<BadgePill label={`${s.personalRecordsHit} PR(s)`} accent/>)}
          </FitCard>)))}
    </ScreenContainer>);
}
const styles = StyleSheet.create({
    title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 14 },
    cardTitle: { color: FITCORE_THEME.primaryText, fontSize: 16, fontWeight: '700' },
    sub: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 4, marginBottom: 8 },
});
