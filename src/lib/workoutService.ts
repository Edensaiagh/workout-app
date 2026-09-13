// src/lib/workoutService.ts
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { saveWorkoutLocally, syncPendingWorkouts, removePendingWorkout } from './localBackup';
import { Workout } from '../types/workout';

const WORKOUTS_COLLECTION = 'workouts';

async function pushWorkoutToCloud(workout: Workout): Promise<void> {
  const ref = doc(db, WORKOUTS_COLLECTION, workout.id);
  await setDoc(ref, workout);
}

export async function saveWorkout(workout: Workout): Promise<{ savedTo: 'cloud' | 'local' }> {
  try {
    await pushWorkoutToCloud(workout);
    return { savedTo: 'cloud' };
  } catch {
    await saveWorkoutLocally(workout);
    return { savedTo: 'local' };
  }
}

// מנסה לשלוח ל-Firestore כל אימון שנתקע מקומית מפעם קודמת (למשל שמירה שנכשלה
// בגלל נפילת רשת). קוראים לזה בעליית האפליקציה כשיש משתמש מחובר.
export async function syncPendingWorkoutsToCloud(): Promise<{ synced: number; stillPending: number }> {
  return syncPendingWorkouts(pushWorkoutToCloud);
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await deleteDoc(doc(db, WORKOUTS_COLLECTION, workoutId));
  // גם אם האימון מעולם לא הגיע לענן (נשמר רק מקומית בגלל נפילת רשת),
  // צריך לנקות אותו מהגיבוי המקומי כדי שלא ינסה להיסתנכרן מחדש אחרי המחיקה.
  await removePendingWorkout(workoutId);
}

export async function getUserWorkouts(
  userId: string,
  max = 50
): Promise<Workout[]> {
  // בכוונה בלי orderBy כאן: שילוב where(userId) + orderBy(startedAt) בשדה אחר
  // מחייב אינדקס מורכב שצריך להגדיר ידנית בקונסולת Firebase - בלעדיו השאילתה
  // נכשלת עם "query requires an index". ממיינים בצד הלקוח כדי לא להיות תלויים בזה.
  const q = query(collection(db, WORKOUTS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const workouts = snapshot.docs.map((d) => d.data() as Workout);
  workouts.sort((a, b) => b.startedAt - a.startedAt);
  return workouts.slice(0, max);
}
