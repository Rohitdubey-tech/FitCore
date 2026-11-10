import { useMutation } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BadgePill, FitButton, FitCard, FitInput, ScreenContainer } from '../src/components/ui';
import { mobileApi } from '../src/lib/api';

export default function AIDietPlannerScreen() {
  const router = useRouter();
  const [weightKg, setWeightKg] = useState('72');
  const [heightCm, setHeightCm] = useState('175');
  const [allergies, setAllergies] = useState('');
  const [result, setResult] = useState<{
    dailyTargets: { calories: number; proteinGrams: number; carbsGrams: number; fatsGrams: number };
    safety: { medical_disclaimer: string };
  } | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await mobileApi.post<
        ApiSuccessResponse<{
          plan: {
            dailyTargets: { calories: number; proteinGrams: number; carbsGrams: number; fatsGrams: number };
            safety: { medical_disclaimer: string };
          };
        }>
      >('/ai/diet/generate', {
        age: 26,
        weightKg: Number(weightKg) || 70,
        heightCm: Number(heightCm) || 170,
        fitnessGoal: 'muscle_gain',
        dietaryPreference: 'vegetarian',
        cuisine: 'indian',
        allergies: allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      return res.data.data.plan;
    },
    onSuccess: (plan) => setResult(plan),
  });

  return (
    <ScreenContainer>
      <FitButton label="← Back" variant="secondary" onPress={() => router.back()} />
      <Text style={styles.title}>AI Diet Planner</Text>
      <BadgePill label="VERIFIED NUTRITION BACKING" accent />

      <FitCard style={{ marginTop: 14 }}>
        <FitInput label="Weight (kg)" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
        <FitInput label="Height (cm)" keyboardType="numeric" value={heightCm} onChangeText={setHeightCm} />
        <FitInput label="Allergies (comma-separated)" value={allergies} onChangeText={setAllergies} />
        <FitButton
          label="Generate Vegetarian Plan"
          onPress={() => generateMutation.mutate()}
          loading={generateMutation.isPending}
        />
      </FitCard>

      {result && (
        <FitCard style={{ borderColor: FITCORE_THEME.primaryAccent }}>
          <Text style={styles.resTitle}>
            Target: {result.dailyTargets.calories} kcal (P {result.dailyTargets.proteinGrams}g)
          </Text>
          <Text style={styles.note}>{result.safety.medical_disclaimer}</Text>
        </FitCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  resTitle: { color: FITCORE_THEME.primaryAccent, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  note: { color: FITCORE_THEME.secondaryText, fontSize: 12, lineHeight: 18 },
});
