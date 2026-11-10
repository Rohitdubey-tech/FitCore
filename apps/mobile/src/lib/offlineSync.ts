import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { mobileApi } from './api';

const QUEUE_KEY = 'fitcore_offline_workout_queue';

export interface OfflineWorkoutPayload {
  localId: string;
  queuedAt: string;
  title: string;
  durationMinutes: number;
  status: 'completed';
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: Array<{
      setNumber: number;
      reps: number;
      weightKg: number;
      isCompleted: boolean;
    }>;
  }>;
}

interface OfflineSyncState {
  queue: OfflineWorkoutPayload[];
  isSyncing: boolean;
  lastSyncedAt: string | null;
  loadQueue: () => Promise<void>;
  enqueueWorkout: (payload: Omit<OfflineWorkoutPayload, 'localId' | 'queuedAt'>) => Promise<void>;
  syncQueue: () => Promise<{ synced: number; remaining: number }>;
}

export const useOfflineSyncStore = create<OfflineSyncState>((set, get) => ({
  queue: [],
  isSyncing: false,
  lastSyncedAt: null,
  loadQueue: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) {
        set({ queue: JSON.parse(raw) as OfflineWorkoutPayload[] });
      }
    } catch {
      // Ignore storage read errors
    }
  },
  enqueueWorkout: async (payload) => {
    const item: OfflineWorkoutPayload = {
      ...payload,
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      queuedAt: new Date().toISOString(),
    };
    const nextQueue = [...get().queue, item];
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(nextQueue));
    set({ queue: nextQueue });
  },
  syncQueue: async () => {
    const { queue, isSyncing } = get();
    if (isSyncing || queue.length === 0) {
      return { synced: 0, remaining: queue.length };
    }

    set({ isSyncing: true });
    const failed: OfflineWorkoutPayload[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        await mobileApi.post('/workout-sessions', {
          title: item.title,
          durationMinutes: item.durationMinutes,
          status: item.status,
          startedAt: item.queuedAt,
          exercises: item.exercises,
        });
        synced += 1;
      } catch {
        failed.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    set({
      queue: failed,
      isSyncing: false,
      lastSyncedAt: synced > 0 ? new Date().toISOString() : get().lastSyncedAt,
    });

    return { synced, remaining: failed.length };
  },
}));

