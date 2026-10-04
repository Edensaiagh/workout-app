// src/lib/personalRecords.ts
//
// שיאים אישיים - מחושבים ונשמרים במסמך אחד לכל משתמש (personalRecords/{userId}),
// לא נטענים או נבדקים בזמן אמת במסך האימון. מוצגים במסך ההיסטוריה, ומספר השיאים
// שנשברו באימון האחרון מוצג במסך "אימון הושלם" ובכרטיס השיתוף.
//
// חשוב: רק תרגילים שהשם שלהם (אחרי trim) מופיע בדיוק ב-EXERCISE_NAMES (ספריית התרגילים) נספרים.
// תרגיל שהוקלד חופשי ולא מופיע ברשימה - הסטים שלו נשמרים כרגיל באימון עצמו,
// אבל הוא לא משפיע על personalRecords ולא מוצג במסך ההיסטוריה בתור שיא.

import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { EXERCISE_NAMES, getExerciseKind } from '../constants/exerciseLibrary';
import { exerciseVolume } from './setMath';
import { Workout } from '../types/workout';

const PERSONAL_RECORDS_COLLECTION = 'personalRecords';

export interface ExerciseRecord {
  maxWeight: number; // ק"ג, המשקל הגבוה ביותר שהורם בסט בודד (בתרגיל עם עזרה: 0, ראו minAssistWeight)
  maxReps: number; // מספר החזרות הגבוה ביותר בסט בודד (בדו-צדדי: לפי הצד החלש בסט, כלומר min(ימין, שמאל))
  minAssistWeight?: number; // רק בתרגיל עם עזרה: העזרה הנמוכה ביותר (בק"ג) שבה בוצע סט. פחות = טוב יותר
  maxSessionVolume: number; // הנפח (משקל × חזרות, סכום כל הסטים) הגבוה ביותר לתרגיל הזה באימון בודד
  updatedAt: number; // Date.now() של העדכון האחרון - לשימוש עתידי (מיון/הצגה), לא חובה היום
}

export type PersonalRecordsMap = Record<string, ExerciseRecord>;

/** שיא בודד שנשבר באימון - להצגה במסך "אימון הושלם" */
export interface BrokenRecord {
  exercise: string;
  kind: 'weight' | 'reps' | 'volume' | 'assist';
  value: number; // הערך החדש (ק"ג / חזרות / נפח בק"ג / עזרה בק"ג)
  delta: number | null; // כמה השתפר מהשיא הקודם (תמיד חיובי; ב-assist: כמה פחות עזרה); null = זה השיא הראשון בתרגיל
}

export interface PersonalRecordsUpdate {
  count: number; // כמה שיאים נשברו (ברמת שדה בודד, לא ברמת תרגיל)
  records: BrokenRecord[];
}

const NO_RECORDS: PersonalRecordsUpdate = { count: 0, records: [] };

const LIBRARY_EXERCISES_SET = new Set(EXERCISE_NAMES);

type WorkoutRecord = Omit<ExerciseRecord, 'updatedAt'>;

function emptyRecord(): WorkoutRecord {
  return { maxWeight: 0, maxReps: 0, maxSessionVolume: 0 };
}

/** שולף את מסמך השיאים האישיים של המשתמש. מחזיר מפה ריקה אם עוד אין כזה. */
export async function getPersonalRecords(userId: string): Promise<PersonalRecordsMap> {
  const snap = await getDoc(doc(db, PERSONAL_RECORDS_COLLECTION, userId));
  return snap.exists() ? (snap.data() as PersonalRecordsMap) : {};
}

/**
 * מחשב, לכל תרגיל מוכר (מספריית התרגילים) שמופיע באימון הזה:
 * המשקל המקסימלי בסט בודד, מספר החזרות המקסימלי בסט בודד, והנפח הכולל של
 * התרגיל באימון הזה (סכום reps*weight על פני כל הסטים שלו באימון).
 *
 * תרגיל יכול תיאורטית להופיע כמה פעמים באותו אימון (למשל אם עברו הלאה וחזרו
 * אליו) - במקרה כזה מאחדים: מקס' על המשקל/חזרות, וסכום על הנפח.
 */
function recordsFromWorkout(workout: Workout): Record<string, WorkoutRecord> {
  const result: Record<string, WorkoutRecord> = {};

  workout.exercises.forEach((ex) => {
    const name = ex.name.trim();
    if (!LIBRARY_EXERCISES_SET.has(name)) return; // תרגיל חופשי שלא ברשימה - לא נספר
    if (ex.sets.length === 0) return;

    const kind = getExerciseKind(name);
    let maxWeight = 0;
    let maxReps = 0;
    let minAssist: number | undefined;
    ex.sets.forEach((s) => {
      if (kind === 'assisted') {
        // "המשקל" הוא העזרה: שיא = הכי פחות עזרה, ולא הכי הרבה משקל
        if (minAssist === undefined || s.weight < minAssist) minAssist = s.weight;
      } else if (s.weight > maxWeight) {
        maxWeight = s.weight;
      }
      // דו-צדדי: שיא חזרות לפי הצד החלש (כמה חזרות עשית בשני הצדדים)
      const reps =
        kind === 'unilateral' && s.repsRight !== undefined && s.repsLeft !== undefined
          ? Math.min(s.repsRight, s.repsLeft)
          : s.reps;
      if (reps > maxReps) maxReps = reps;
    });
    const sessionVolume = exerciseVolume(name, ex.sets); // 0 בתרגיל עם עזרה

    const existing = result[name];
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, maxWeight);
      existing.maxReps = Math.max(existing.maxReps, maxReps);
      existing.maxSessionVolume += sessionVolume;
      if (minAssist !== undefined) {
        existing.minAssistWeight =
          existing.minAssistWeight === undefined ? minAssist : Math.min(existing.minAssistWeight, minAssist);
      }
    } else {
      result[name] = {
        maxWeight,
        maxReps,
        maxSessionVolume: sessionVolume,
        ...(minAssist !== undefined ? { minAssistWeight: minAssist } : {}),
      };
    }
  });

  return result;
}

/**
 * מעדכן את מסמך personalRecords של המשתמש לפי אימון שהושלם:
 * קורא את השיאים הקיימים, משווה מול הנתונים מהאימון הזה, ושומר רק את המקסימום
 * בכל שדה. כותב ל-Firestore רק אם בפועל נשבר שיא כלשהו (אחרת לא נוגע במסמך).
 *
 * מחזיר את מספר השיאים שנשברו (ברמת שדה בודד - משקל/חזרות/נפח, לא ברמת תרגיל)
 * ואת פירוט השיאים, כדי שאפשר יהיה להציג "X שיאים חדשים" מיד אחרי סיום האימון.
 */
export async function updatePersonalRecordsForWorkout(userId: string, workout: Workout): Promise<PersonalRecordsUpdate> {
  const fromWorkout = recordsFromWorkout(workout);
  const exerciseNames = Object.keys(fromWorkout);
  if (exerciseNames.length === 0) return NO_RECORDS;

  const existing = await getPersonalRecords(userId);
  const merged: PersonalRecordsMap = { ...existing };
  const brokenRecords: BrokenRecord[] = [];
  const now = Date.now();

  exerciseNames.forEach((name) => {
    const incoming = fromWorkout[name];
    const prev = merged[name] ?? { ...emptyRecord(), updatedAt: now };

    const weightBroken = incoming.maxWeight > prev.maxWeight;
    const repsBroken = incoming.maxReps > prev.maxReps;
    const volumeBroken = incoming.maxSessionVolume > prev.maxSessionVolume;
    // עזרה נמוכה יותר = שיא (השיא הראשון בתרגיל נחשב גם הוא)
    const assistBroken =
      incoming.minAssistWeight !== undefined &&
      (prev.minAssistWeight === undefined || incoming.minAssistWeight < prev.minAssistWeight);

    if (!weightBroken && !repsBroken && !volumeBroken && !assistBroken) return;

    const deltaOf = (next: number, before: number) => (before > 0 ? next - before : null);
    if (assistBroken) {
      const before = prev.minAssistWeight;
      brokenRecords.push({
        exercise: name,
        kind: 'assist',
        value: incoming.minAssistWeight as number,
        delta: before === undefined ? null : before - (incoming.minAssistWeight as number),
      });
    }
    if (weightBroken) {
      brokenRecords.push({ exercise: name, kind: 'weight', value: incoming.maxWeight, delta: deltaOf(incoming.maxWeight, prev.maxWeight) });
    }
    if (volumeBroken) {
      brokenRecords.push({ exercise: name, kind: 'volume', value: incoming.maxSessionVolume, delta: deltaOf(incoming.maxSessionVolume, prev.maxSessionVolume) });
    }
    if (repsBroken) {
      brokenRecords.push({ exercise: name, kind: 'reps', value: incoming.maxReps, delta: deltaOf(incoming.maxReps, prev.maxReps) });
    }

    merged[name] = {
      maxWeight: Math.max(prev.maxWeight, incoming.maxWeight),
      maxReps: Math.max(prev.maxReps, incoming.maxReps),
      maxSessionVolume: Math.max(prev.maxSessionVolume, incoming.maxSessionVolume),
      ...(incoming.minAssistWeight !== undefined || prev.minAssistWeight !== undefined
        ? {
            minAssistWeight: Math.min(
              incoming.minAssistWeight ?? Infinity,
              prev.minAssistWeight ?? Infinity
            ),
          }
        : {}),
      updatedAt: now,
    };
  });

  if (brokenRecords.length === 0) return NO_RECORDS; // שום שיא לא נשבר - לא כותבים מסמך מיותר

  await setDoc(doc(db, PERSONAL_RECORDS_COLLECTION, userId), merged);
  return { count: brokenRecords.length, records: brokenRecords };
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
