import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccessResponse, ExerciseDTO } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgePill, FitButton, FitCard, FitInput, ScreenContainer } from '../../src/components/ui';
import { mobileApi } from '../../src/lib/api';
import { useOfflineSyncStore } from '../../src/lib/offlineSync';

export default function MobileWorkoutsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const enqueueWorkout = useOfflineSyncStore((s) => s.enqueueWorkout);

  const [search, setSearch] = useState('');
  const [restSeconds, setRestSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);

  const [selectedEx, setSelectedEx] = useState<ExerciseDTO | null>(null);
  const [weightKg, setWeightKg] = useState('60');
  const [reps, setReps] = useState('8');

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const exercisesQuery = useQuery({
    queryKey: ['mobile', 'exercises', search],
    queryFn: async () => {
      const res = await mobileApi.get<ApiSuccessResponse<{ exercises: ExerciseDTO[] }>>(
        '/exercises',
        { params: { search: search.trim() || undefined, limit: 25 } }
      );
      return res.data.data.exercises;
    },
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEx) throw new Error('Select an exercise first');
      const payload = {
        title: `${selectedEx.name} Session`,
        durationMinutes: 40,
        status: 'completed' as const,
        exercises: [
          {
            exerciseId: selectedEx.id,
            exerciseName: selectedEx.name,
            sets: [
              {
                setNumber: 1,
                reps: Number(reps) || 8,
                weightKg: Number(weightKg) || 0,
                isCompleted: true,
              },
            ],
          },
        ],
      };

      try {
        await mobileApi.post('/workout-sessions', payload);
        return { offline: false };
      } catch {
        await enqueueWorkout(payload);
        return { offline: true };
      }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'workout-stats'] });
      Alert.alert(
        result.offline ? 'Saved Offline' : 'Workout Logged',
        result.offline
          ? 'No network connection — workout queued locally and will auto-sync when online.'
          : 'Your sets and volume have been saved to FITCORE.'
      );
    },
  });

  const exercises = exercisesQuery.data || [];

  return (
    <ScreenContainer>
      <Text style={styles.badge}>TRAINING ENGINE</Text>
      <Text style={styles.title}>Workouts & Rest Timer</Text>

      <FitCard>
        <Text style={styles.cardLabel}>REST TIMER</Text>
        <Text style={styles.clock}>
          {String(Math.floor(restSeconds / 60)).padStart(2, '0')}:
          {String(restSeconds % 60).padStart(2, '0')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <FitButton
              label={timerRunning ? 'Pause' : 'Start 90s'}
              onPress={() => {
                if (!timerRunning && restSeconds === 0) setRestSeconds(90);
                setTimerRunning((r) => !r);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FitButton
              label="Reset"
              variant="secondary"
              onPress={() => {
                setTimerRunning(false);
                setRestSeconds(90);
              }}
            />
          </View>
        </View>
      </FitCard>

      {selectedEx && (
        <FitCard style={{ borderColor: FITCORE_THEME.primaryAccent }}>
          <Text style={styles.cardTitle}>Quick Log: {selectedEx.name}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <FitInput label="Weight (kg)" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
            </View>
            <View style={{ flex: 1 }}>
              <FitInput label="Reps" keyboardType="numeric" value={reps} onChangeText={setReps} />
            </View>
          </View>
          <FitButton
            label="Save Set (Offline-Safe)"
            onPress={() => logMutation.mutate()}
            loading={logMutation.isPending}
          />
        </FitCard>
      )}

      <FitInput
        label="Exercise Library"
        placeholder="Search chest, squat, barbell..."
        value={search}
        onChangeText={setSearch}
      />

      {exercises.map((ex) => (
        <FitCard key={ex.id}>
          <View style={styles.exHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{ex.name}</Text>
              <Text style={styles.cardSub}>
                {ex.muscleGroup.replace('_', ' ')} · {ex.equipment.replace('_', ' ')}
              </Text>
            </View>
            <BadgePill label={ex.difficulty} accent />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable style={styles.actionChip} onPress={() => setSelectedEx(ex)}>
              <Text style={styles.actionText}>Log Set</Text>
            </Pressable>
            <Pressable
              style={styles.actionChip}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}
            >
              <Text style={styles.actionText}>Instructions</Text>
            </Pressable>
          </View>
        </FitCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badge: { color: FITCORE_THEME.primaryAccent, fontSize: 12, fontWeight: '700' },
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  cardLabel: { color: FITCORE_THEME.secondaryText, fontSize: 11, fontWeight: '700' },
  clock: { color: FITCORE_THEME.primaryAccent, fontSize: 38, fontWeight: '800', marginVertical: 10 },
  exHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { color: FITCORE_THEME.primaryText, fontSize: 15, fontWeight: '700' },
  cardSub: { color: FITCORE_THEME.secondaryText, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  actionChip: {
    borderWidth: 1,
    borderColor: FITCORE_THEME.border,
    backgroundColor: '#141618',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

