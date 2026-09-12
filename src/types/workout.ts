// src/types/workout.ts

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number; // בק"ג
  restBeforeSeconds: number | null; // כמה זמן נחו לפני הסט הזה (null לסט הראשון בתרגיל)
  timestamp: number;
}

export interface WorkoutExercise {
  id: string;
  name: string; // שם חופשי - המשתמש מקליד בזמן האימון (לא מספריה קבועה)
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  userId: string;
  startedAt: number;
  finishedAt: number | null;
  exercises: WorkoutExercise[];
  totalVolume?: number; // סה"כ נפח (משקל * חזרות) - מחושב בסיום
  status: 'active' | 'completed' | 'cancelled';
}
