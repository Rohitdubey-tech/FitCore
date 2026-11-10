import AsyncStorage from '@react-native-async-storage/async-storage';
import { FITNESS_GOALS, FITCORE_THEME, type FitnessGoal } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FitButton, FitInput, ScreenContainer } from '../src/components/ui';

export default function FitnessSetupScreen() {
  const router = useRouter();
  const [goal, setGoal] = useState<FitnessGoal>('muscle_gain');
  const [weightKg, setWeightKg] = useState('72');
  const [heightCm, setHeightCm] = useState('175');

  const handleSave = async () => {
    await AsyncStorage.setItem(
      'fitcore_fitness_profile',
      JSON.stringify({ goal, weightKg: Number(weightKg) || 70, heightCm: Number(heightCm) || 170 })
    );
    router.replace('/(tabs)/home');
  };

  return (
    <ScreenContainer>
      <Text style={styles.badge}>PERSONALIZATION</Text>
      <Text style={styles.title}>Fitness Profile Setup</Text>
      <Text style={styles.subtitle}>
        Tailor your workout targets, calorie goals, and AI recommendations.
      </Text>

      <Text style={styles.sectionLabel}>Primary Goal</Text>
      <View style={styles.goalRow}>
        {FITNESS_GOALS.map((g) => (
          <Pressable
            key={g}
            onPress={() => setGoal(g)}
            style={[styles.chip, goal === g && styles.chipActive]}
          >
            <Text style={[styles.chipText, goal === g && { color: '#000' }]}>
              {g.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <FitInput label="Current weight (kg)" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
      <FitInput label="Height (cm)" keyboardType="numeric" value={heightCm} onChangeText={setHeightCm} />

      <FitButton label="Complete Setup" onPress={() => void handleSave()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badge: { color: FITCORE_THEME.primaryAccent, fontSize: 12, fontWeight: '700', marginTop: 12 },
  title: { color: FITCORE_THEME.primaryText, fontSize: 26, fontWeight: '800', marginTop: 6 },
  subtitle: { color: FITCORE_THEME.secondaryText, fontSize: 14, marginTop: 4, marginBottom: 20 },
  sectionLabel: { color: FITCORE_THEME.secondaryText, fontSize: 12, marginBottom: 8 },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: FITCORE_THEME.border,
    backgroundColor: FITCORE_THEME.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: FITCORE_THEME.primaryAccent, borderColor: FITCORE_THEME.primaryAccent },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});

