// src/lib/personalRecords.ts
//
// שיאים אישיים - מחושבים ונשמרים במסמך אחד לכל משתמש (personalRecords/{userId}),
// לא נטענים או נבדקים בזמן אמת במסך האימון. מוצגים במסך ההיסטוריה, ומספר השיאים
// שנשברו באימון האחרון מוצג במסך "אימון הושלם" ובכרטיס השיתוף.
//
// חשוב: רק תרגילים שהשם שלהם (אחרי trim) מופיע בדיוק ב-COMMON_EXERCISES נספרים.
// תרגיל שהוקלד חופשי ולא מופיע ברשימה - הסטים שלו נשמרים כרגיל באימון עצמו,
// אבל הוא לא משפיע על personalRecords ולא מוצג במסך ההיסטוריה בתור שיא.

import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { COMMON_EXERCISES } from '../constants/commonExercises';
import { Workout } from '../types/workout';

const PERSONAL_RECORDS_COLLECTION = 'personalRecords';

export interface ExerciseRecord {
  maxWeight: number; // ק"ג, המשקל הגבוה ביותר שהורם בסט בודד
  maxReps: number; // מספר החזרות הגבוה ביותר בסט בודד
  maxSessionVolume: number; // הנפח (משקל × חזרות, סכום כל הסטים) הגבוה ביותר לתרגיל הזה באימון בודד
  updatedAt: number; // Date.now() של העדכון האחרון - לשימוש עתידי (מיון/הצגה), לא חובה היום
}

export type PersonalRecordsMap = Record<string, ExerciseRecord>;

const COMMON_EXERCISES_SET = new Set(COMMON_EXERCISES);

function emptyRecord(): Omit<ExerciseRecord, 'updatedAt'> {
  return { maxWeight: 0, maxReps: 0, maxSessionVolume: 0 };
}

/** שולף את מסמך השיאים האישיים של המשתמש. מחזיר מפה ריקה אם עוד אין כזה. */
export async function getPersonalRecords(userId: string): Promise<PersonalRecordsMap> {
  const snap = await getDoc(doc(db, PERSONAL_RECORDS_COLLECTION, userId));
  return snap.exists() ? (snap.data() as PersonalRecordsMap) : {};
}

/**
 * מחשב, לכל תרגיל מוכר (מ-COMMON_EXERCISES) שמופיע באימון הזה:
 * המשקל המקסימלי בסט בודד, מספר החזרות המקסימלי בסט בודד, והנפח הכולל של
 * התרגיל באימון הזה (סכום reps*weight על פני כל הסטים שלו באימון).
 *
 * תרגיל יכול תיאורטית להופיע כמה פעמים באותו אימון (למשל אם עברו הלאה וחזרו
 * אליו) - במקרה כזה מאחדים: מקס' על המשקל/חזרות, וסכום על הנפח.
 */
function recordsFromWorkout(workout: Workout): Record<string, Omit<ExerciseRecord, 'updatedAt'>> {
  const result: Record<string, Omit<ExerciseRecord, 'updatedAt'>> = {};

  workout.exercises.forEach((ex) => {
    const name = ex.name.trim();
    if (!COMMON_EXERCISES_SET.has(name)) return; // תרגיל חופשי שלא ברשימה - לא נספר
    if (ex.sets.length === 0) return;

    let maxWeight = 0;
    let maxReps = 0;
    let sessionVolume = 0;
    ex.sets.forEach((s) => {
      if (s.weight > maxWeight) maxWeight = s.weight;
      if (s.reps > maxReps) maxReps = s.reps;
      sessionVolume += s.weight * s.reps;
    });

    const existing = result[name];
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, maxWeight);
      existing.maxReps = Math.max(existing.maxReps, maxReps);
      existing.maxSessionVolume += sessionVolume;
    } else {
      result[name] = { maxWeight, maxReps, maxSessionVolume: sessionVolume };
    }
  });

  return result;
}

/**
 * מעדכן את מסמך personalRecords של המשתמש לפי אימון שהושלם:
 * קורא את השיאים הקיימים, משווה מול הנתונים מהאימון הזה, ושומר רק את המקסימום
 * בכל שדה. כותב ל-Firestore רק אם בפועל נשבר שיא כלשהו (אחרת לא נוגע במסמך).
 *
 * מחזיר את מספר השיאים שנשברו (ברמת שדה בודד - משקל/חזרות/נפח, לא ברמת תרגיל),
 * כדי שאפשר יהיה להציג "X שיאים חדשים" מיד אחרי סיום האימון.
 */
export async function updatePersonalRecordsForWorkout(userId: string, workout: Workout): Promise<number> {
  const fromWorkout = recordsFromWorkout(workout);
  const exerciseNames = Object.keys(fromWorkout);
  if (exerciseNames.length === 0) return 0;

  const existing = await getPersonalRecords(userId);
  const merged: PersonalRecordsMap = { ...existing };
  let brokenCount = 0;
  const now = Date.now();

  exerciseNames.forEach((name) => {
    const incoming = fromWorkout[name];
    const prev = merged[name] ?? { ...emptyRecord(), updatedAt: now };

    const weightBroken = incoming.maxWeight > prev.maxWeight;
    const repsBroken = incoming.maxReps > prev.maxReps;
    const volumeBroken = incoming.maxSessionVolume > prev.maxSessionVolume;

    if (!weightBroken && !repsBroken && !volumeBroken) return;

    brokenCount += [weightBroken, repsBroken, volumeBroken].filter(Boolean).length;

    merged[name] = {
      maxWeight: Math.max(prev.maxWeight, incoming.maxWeight),
      maxReps: Math.max(prev.maxReps, incoming.maxReps),
      maxSessionVolume: Math.max(prev.maxSessionVolume, incoming.maxSessionVolume),
      updatedAt: now,
    };
  });

  if (brokenCount === 0) return 0; // שום שיא לא נשבר - לא כותבים מסמך מיותר

  await setDoc(doc(db, PERSONAL_RECORDS_COLLECTION, userId), merged);
  return brokenCount;
}

/**
 * מחיקה ידנית של שיא בודד לתרגיל אחד - נקראת ממסך "ניהול שיאים", לא קשורה
 * בשום צורה למחיקת אימונים (ראו ההערה על כך ב-deleteWorkout, workoutService.ts).
 *
 * מוחקת רק את השדה של התרגיל הזה מתוך מסמך personalRecords - לא נוגעת
 * בשאר התרגילים, ולא מנסה "לנחש" שיא חלופי במקומו.
 */
export async function deletePersonalRecord(userId: string, exerciseName: string): Promise<void> {
  const ref = doc(db, PERSONAL_RECORDS_COLLECTION, userId);
  await updateDoc(ref, { [exerciseName]: deleteField() });
}
