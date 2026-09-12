// src/lib/workoutService.ts
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { saveWorkoutLocally } from './localBackup';
import { Workout } from '../types/workout';

const WORKOUTS_COLLECTION = 'workouts';

export async function saveWorkout(workout: Workout): Promise<{ savedTo: 'cloud' | 'local' }> {
  const ref = doc(db, WORKOUTS_COLLECTION, workout.id);

  try {
    await setDoc(ref, workout);
    return { savedTo: 'cloud' };
  } catch {
    await saveWorkoutLocally(workout);
    return { savedTo: 'local' };
  }
}

export async function getUserWorkouts(
  userId: string,
  max = 50
): Promise<Workout[]> {
  const q = query(
    collection(db, WORKOUTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('startedAt', 'desc'),
    limit(max)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Workout);
}
