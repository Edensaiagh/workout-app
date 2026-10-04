import { collection, getDocs, query, where } from 'firebase/firestore';
import { exerciseVolume } from './setMath';
import { db } from './firebase';
import { Workout } from '../types/workout';
import { ExerciseVolume, ShareCardData } from '../components/ShareCard';

const MAX_EXERCISES_IN_CARD = 8;

export function getTopExercisesByVolume(exercises: ExerciseVolume[]): ExerciseVolume[] {
  return [...exercises].sort((a, b) => b.volumeKg - a.volumeKg).slice(0, MAX_EXERCISES_IN_CARD);
}

/** תחילת השבוע הנוכחי - יום ראשון האחרון בשעה 00:00 (לא "7 ימים אחורה"). */
export function getStartOfWeekSunday(from: Date = new Date()): Date {
  const start = new Date(from);
  start.setDate(start.getDate() - start.getDay()); // getDay(): 0 = ראשון
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * מספר האימונים שהושלמו מתחילת השבוע (ראשון 00:00) ועד עכשיו.
 *
 * בכוונה בלי where('status', ...) / where('finishedAt', ...) בשאילתה עצמה -
 * בדיוק כמו ב-getUserWorkouts הקיים ב-workoutService.ts, כדי לא להזדקק
 * לאינדקס מורכב ב-Firebase Console. מסננים בצד הלקוח במקום.
 */
export async function getWorkoutsThisWeekCount(userId: string): Promise<number> {
  const startOfWeekMs = getStartOfWeekSunday().getTime();

  const q = query(collection(db, 'workouts'), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.filter((d) => {
    const w = d.data() as Workout;
    return w.status === 'completed' && w.finishedAt !== null && w.finishedAt >= startOfWeekMs;
  }).length;
}

/**
 * ממיר Workout (מהסוג שמחזיר finishWorkout()) ל-ShareCardData.
 *
 * newPRsCount מגיע מבחוץ (מהערך שכבר חושב ב-saveWorkout, ראו workoutService.ts) -
 * הפונקציה הזו לא מחשבת שיאים בעצמה, כדי לא לקרוא פעמיים לאותם נתונים.
 */
export function buildShareCardDataFromWorkout(
  workout: Workout,
  workoutsThisWeek: number,
  newPRsCount: number
): ShareCardData {
  const exercises: ExerciseVolume[] = workout.exercises.map((ex) => ({
    name: ex.name,
    volumeKg: exerciseVolume(ex.name, ex.sets),
  }));

  const totalVolumeKg = workout.totalVolume ?? exercises.reduce((sum, ex) => sum + ex.volumeKg, 0);
  const durationMinutes =
    workout.finishedAt != null ? Math.max(0, Math.round((workout.finishedAt - workout.startedAt) / 60000)) : 0;

  return {
    durationMinutes,
    date: new Date(workout.finishedAt ?? workout.startedAt),
    totalVolumeKg,
    exerciseCount: exercises.length,
    workoutsThisWeek,
    newPRsCount,
    topExercises: getTopExercisesByVolume(exercises),
  };
}
