import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { FitButton, FitCard, FitInput, ScreenContainer } from '../../src/components/ui';
import { mobileApi } from '../../src/lib/api';

export default function MobileProgressScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [weightKg, setWeightKg] = useState('72');
  const [heightCm, setHeightCm] = useState('175');

  const bodyQuery = useQuery({
    queryKey: ['mobile', 'body-progress'],
    queryFn: async () => {
      const res = await mobileApi.get<
        ApiSuccessResponse<{
          latest: { weightKg: number; bmi?: number } | null;
          weightDeltaKg: number;
        }>
      >('/analytics/body-progress');
      return res.data.data;
    },
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      await mobileApi.post('/analytics/body-metrics', {
        weightKg: Number(weightKg) || 70,
        heightCm: Number(heightCm) || 170,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'body-progress'] });
      Alert.alert('Saved', 'Body weight & BMI updated.');
    },
  });

  const latest = bodyQuery.data?.latest;

  return (
    <ScreenContainer>
      <Text style={styles.badge}>BODY & WORKOUT ANALYTICS</Text>
      <Text style={styles.title}>Progress Overview</Text>

      <FitCard>
        <Text style={styles.label}>Latest Weight & BMI</Text>
        <Text style={styles.big}>
          {latest ? `${latest.weightKg} kg` : '—'}{' '}
          <Text style={styles.sub}>(BMI {latest?.bmi ?? '—'})</Text>
        </Text>
        <Text style={styles.sub}>
          Overall change: {bodyQuery.data?.weightDeltaKg ?? 0} kg
        </Text>
      </FitCard>

      <FitCard>
        <FitInput label="Log Weight (kg)" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
        <FitInput label="Height (cm)" keyboardType="numeric" value={heightCm} onChangeText={setHeightCm} />
        <FitButton
          label="Save Body Metric"
          onPress={() => logMutation.mutate()}
          loading={logMutation.isPending}
        />
      </FitCard>

      <FitButton
        label="View Workout History"
        variant="secondary"
        onPress={() => router.push('/workout-history')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badge: { color: FITCORE_THEME.primaryAccent, fontSize: 12, fontWeight: '700' },
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  label: { color: FITCORE_THEME.secondaryText, fontSize: 12 },
  big: { color: FITCORE_THEME.primaryAccent, fontSize: 28, fontWeight: '800', marginTop: 6 },
  sub: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 4 },
});
