// src/lib/localBackup.ts
// גיבוי מקומי לאימונים שנכשלו בשמירה ל-Firestore (למשל בגלל נפילת רשת).
// שומר ב-AsyncStorage, ומספק פונקציה לנסות לסנכרן שוב מאוחר יותר.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout } from '../types/workout';

const PENDING_KEY = 'pendingWorkouts';

async function readPending(): Promise<Workout[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Workout[]) : [];
  } catch {
    return [];
  }
}

async function writePending(workouts: Workout[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(workouts));
}

export async function saveWorkoutLocally(workout: Workout): Promise<void> {
  const pending = await readPending();
  pending.push(workout);
  await writePending(pending);
}

export async function getPendingWorkouts(): Promise<Workout[]> {
  return readPending();
}

export async function removePendingWorkout(workoutId: string): Promise<void> {
  const pending = await readPending();
  await writePending(pending.filter((w) => w.id !== workoutId));
}

// קוראים לזה בעליית האפליקציה (או כשחוזרת קליטת רשת) כדי לנסות
// לשלוח ל-Firestore כל אימון שנתקע מקומית.
export async function syncPendingWorkouts(
  saveFn: (workout: Workout) => Promise<void>
): Promise<{ synced: number; stillPending: number }> {
  const pending = await readPending();
  if (pending.length === 0) return { synced: 0, stillPending: 0 };

  let synced = 0;
  const stillPending: Workout[] = [];

  for (const workout of pending) {
    try {
      await saveFn(workout);
      synced++;
    } catch {
      stillPending.push(workout);
    }
  }

  await writePending(stillPending);
  return { synced, stillPending: stillPending.length };
}
