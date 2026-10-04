// src/lib/setMath.ts
// חישובים משותפים על סטים, כדי שנפח יחושב אותו דבר בכל המסכים.

import { getExerciseKind } from '../constants/exerciseLibrary';
import type { WorkoutSet } from '../types/workout';

/**
 * נפח הסט בק"ג (משקל × חזרות). בתרגיל עם עזרה הנפח הוא 0: ה"משקל" שם הוא העזרה, ועזרה גדולה
 * לא אומרת שהורם יותר, ולכן לא סופרים אותו. בתרגיל דו-צדדי reps כבר מכיל את שני הצדדים.
 */
export function setVolume(exerciseName: string, set: WorkoutSet): number {
  if (getExerciseKind(exerciseName) === 'assisted') return 0;
  return set.weight * set.reps;
}

export function exerciseVolume(exerciseName: string, sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + setVolume(exerciseName, s), 0);
}
