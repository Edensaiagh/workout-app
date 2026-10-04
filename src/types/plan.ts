// src/types/plan.ts
// "אימון שמור" (תוכנית): תרגילים, מספר סטים ומשקל מתוכנן לכל סט. בלי תאריך ובלי חזרות מתוכננות.

export interface PlannedSet {
  weight: number; // בק"ג. בתרגיל עם עזרה: כמה עזרה. בדו-צדדי: משקל צד ימין
  weightLeft?: number; // רק בתרגיל דו-צדדי: משקל צד שמאל
}

export interface PlannedExercise {
  id: string;
  name: string;
  sets: PlannedSet[]; // מספר הסטים המתוכננים = sets.length
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  exercises: PlannedExercise[];
  createdAt: number;
  updatedAt: number;
}
