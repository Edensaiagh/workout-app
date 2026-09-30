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
import { updatePersonalRecordsForWorkout, BrokenRecord, PersonalRecordsUpdate } from './personalRecords';
import { Workout } from '../types/workout';

const WORKOUTS_COLLECTION = 'workouts';

// שומרת את האימון עצמו, ואז מעדכנת שיאים אישיים על בסיסו.
// מחזירה כמה שיאים נשברו ואילו - שימושי מיד אחרי saveWorkout, כדי להציג "X שיאים חדשים"
// במסך "אימון הושלם" ובכרטיס השיתוף, בלי לקרוא שוב את הנתונים.
async function pushWorkoutToCloud(workout: Workout): Promise<PersonalRecordsUpdate> {
  const ref = doc(db, WORKOUTS_COLLECTION, workout.id);
  await setDoc(ref, workout);

  try {
    return await updatePersonalRecordsForWorkout(workout.userId, workout);
  } catch {
    // עדכון השיאים נכשל - אבל האימון עצמו כבר נשמר בהצלחה, אז לא הופכים
    // את זה לכישלון של השמירה כולה. פשוט הפעם בלי עדכון שיאים.
    return { count: 0, records: [] };
  }
}

export async function saveWorkout(
  workout: Workout
): Promise<{ savedTo: 'cloud' | 'local'; newPRsCount: number; newRecords: BrokenRecord[] }> {
  try {
    const update = await pushWorkoutToCloud(workout);
    return { savedTo: 'cloud', newPRsCount: update.count, newRecords: update.records };
  } catch {
    await saveWorkoutLocally(workout);
    // האימון נשמר רק מקומית - השיאים יתעדכנו בפעם הבאה שהוא יסתנכרן לענן
    // (syncPendingWorkoutsToCloud, למטה), לא עכשיו.
    return { savedTo: 'local', newPRsCount: 0, newRecords: [] };
  }
}

// מנסה לשלוח ל-Firestore כל אימון שנתקע מקומית מפעם קודמת (למשל שמירה שנכשלה
// בגלל נפילת רשת). קוראים לזה בעליית האפליקציה כשיש משתמש מחובר.
// (משתמשת באותו pushWorkoutToCloud, ולכן גם השיאים מתעדכנים כאן באופן טבעי -
// רק שאף אחד לא צריך לראות את המספר כרגע, ולכן מתעלמים ממנו).
export async function syncPendingWorkoutsToCloud(): Promise<{ synced: number; stillPending: number }> {
  return syncPendingWorkouts((workout) => pushWorkoutToCloud(workout).then(() => undefined));
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await deleteDoc(doc(db, WORKOUTS_COLLECTION, workoutId));
  // גם אם האימון מעולם לא הגיע לענן (נשמר רק מקומית בגלל נפילת רשת),
  // צריך לנקות אותו מהגיבוי המקומי כדי שלא ינסה להיסתנכרן מחדש אחרי המחיקה.
  await removePendingWorkout(workoutId);
  // הערה: מחיקת אימון לא נוגעת בשיאים האישיים בכלל, גם אם הוא זה שקבע אותם.
  // מחיקת שיא היא פעולה נפרדת ומודעת, שנעשית ידנית ממסך "ניהול שיאים"
  // (ראו deletePersonalRecord ב-lib/personalRecords.ts).
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
