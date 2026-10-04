// src/types/workout.ts

export interface WorkoutSet {
  id: string;
  reps: number; // בתרגיל דו-צדדי: סך החזרות משני הצדדים (repsRight + repsLeft), כדי שחישובי נפח וסיכומים יישארו נכונים
  weight: number; // בק"ג. בתרגיל עם עזרה: כמה עזרה הוגדרה במכונה (פחות עזרה = קשה יותר)
  repsRight?: number; // רק בתרגיל דו-צדדי
  repsLeft?: number; // רק בתרגיל דו-צדדי
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
