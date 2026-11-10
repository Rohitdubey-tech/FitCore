import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse, ExerciseDTO } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { BadgePill, FitButton, FitCard, ScreenContainer } from '../../src/components/ui';
import { mobileApi } from '../../src/lib/api';

export default function ExerciseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['mobile', 'exercise', id],
    queryFn: async () => {
      const res = await mobileApi.get<ApiSuccessResponse<{ exercises: ExerciseDTO[] }>>(
        '/exercises',
        { params: { limit: 50 } }
      );
      return res.data.data.exercises.find((e) => e.id === id) || null;
    },
  });

  const exercise = query.data;

  return (
    <ScreenContainer>
      <FitButton label="← Back" variant="secondary" onPress={() => router.back()} />
      {exercise ? (
        <>
          <Text style={styles.title}>{exercise.name}</Text>
          <BadgePill label={`${exercise.muscleGroup} · ${exercise.equipment}`} accent />
          <Text style={styles.desc}>{exercise.description}</Text>

          <FitCard>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {exercise.instructions.map((step, i) => (
              <Text key={i} style={styles.step}>
                {i + 1}. {step}
              </Text>
            ))}
          </FitCard>

          {exercise.tips.length > 0 && (
            <FitCard style={{ borderColor: FITCORE_THEME.primaryAccent }}>
              <Text style={styles.sectionTitle}>Coaching Tips</Text>
              {exercise.tips.map((tip, i) => (
                <Text key={i} style={styles.step}>
                  • {tip}
                </Text>
              ))}
            </FitCard>
          )}
        </>
      ) : (
        <Text style={styles.desc}>Loading exercise details...</Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  desc: { color: FITCORE_THEME.secondaryText, fontSize: 14, marginVertical: 14, lineHeight: 20 },
  sectionTitle: { color: FITCORE_THEME.primaryAccent, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  step: { color: FITCORE_THEME.primaryText, fontSize: 13, marginBottom: 6, lineHeight: 19 },
});

