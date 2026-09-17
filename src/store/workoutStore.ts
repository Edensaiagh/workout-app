// src/store/workoutStore.ts
// ניהול המצב של האימון הפעיל - הכל בזיכרון, נשמר ל-Firestore רק בסיום
// (ואם השמירה נכשלת - נופל לאחסון מקומי, ראו lib/localBackup.ts)

import { create } from 'zustand';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/workout';

const REST_SECONDS_DEFAULT = 30;

interface RestState {
  isActive: boolean;
  targetSeconds: number;
  startedAt: number | null; // Date.now() כשהמנוחה התחילה
  lastCompletedSeconds: number | null; // תוצג מיד כשהמנוחה מסתיימת, עד שתיקשר לסט הבא
}

interface WorkoutStore {
  activeWorkout: Workout | null;
  currentExerciseIndex: number;
  rest: RestState;

  // אימון
  startWorkout: (userId: string) => void;
  finishWorkout: () => Workout | null;
  cancelWorkout: () => void;

  // ניווט בין תרגילים
  setExerciseName: (name: string) => void;
  goToNextExercise: () => void;
  goToPrevExercise: () => void;

  // סטים
  addSet: (reps: number, weight: number) => { ok: true } | { ok: false; error: string };
  deleteSet: (setId: string) => void;

  // מנוחה
  extendRest: (seconds: number) => void;
  finishRestEarly: () => void;
  completeRestNaturally: () => void; // נקרא כשהספירה מגיעה ל-0
}

const genId = () => Math.random().toString(36).slice(2, 10);

function startRestInternal(targetSeconds: number = REST_SECONDS_DEFAULT): RestState {
  return {
    isActive: true,
    targetSeconds,
    startedAt: Date.now(),
    lastCompletedSeconds: null,
  };
}

const idleRest: RestState = {
  isActive: false,
  targetSeconds: REST_SECONDS_DEFAULT,
  startedAt: null,
  lastCompletedSeconds: null,
};

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,
  currentExerciseIndex: 0,
  rest: idleRest,

  startWorkout: (userId) => {
    const firstExercise: WorkoutExercise = { id: genId(), name: '', sets: [] };
    const newWorkout: Workout = {
      id: genId(),
      userId,
      startedAt: Date.now(),
      finishedAt: null,
      exercises: [firstExercise],
      status: 'active',
    };
    set({ activeWorkout: newWorkout, currentExerciseIndex: 0, rest: idleRest });
  },

  finishWorkout: () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return null;

    // מסננים תרגילים ריקים (בלי שם או בלי סטים) שנוצרו אבל לא מולאו
    const cleanExercises = activeWorkout.exercises.filter(
      (ex) => ex.name.trim().length > 0 && ex.sets.length > 0
    );

    // אם אחרי הסינון לא נשאר כלום - אין מה לשמור. לא מאפסים את האימון הפעיל,
    // כדי שהמשתמשת תוכל להמשיך ולהוסיף סטים ולנסות לסיים שוב.
    if (cleanExercises.length === 0) {
      return null;
    }

    const totalVolume = cleanExercises.reduce((sum, ex) => {
      return sum + ex.sets.reduce((exSum, s) => exSum + s.weight * s.reps, 0);
    }, 0);

    const completedWorkout: Workout = {
      ...activeWorkout,
      exercises: cleanExercises,
      finishedAt: Date.now(),
      status: 'completed',
      totalVolume,
    };

    set({ activeWorkout: null, currentExerciseIndex: 0, rest: idleRest });
    return completedWorkout;
  },

  cancelWorkout: () => {
    set({ activeWorkout: null, currentExerciseIndex: 0, rest: idleRest });
  },

  setExerciseName: (name) => {
    const { activeWorkout, currentExerciseIndex } = get();
    if (!activeWorkout) return;
    const exercises = activeWorkout.exercises.map((ex, i) =>
      i === currentExerciseIndex ? { ...ex, name } : ex
    );
    set({ activeWorkout: { ...activeWorkout, exercises } });
  },

  goToNextExercise: () => {
    const { activeWorkout, currentExerciseIndex } = get();
    if (!activeWorkout) return;

    const isLast = currentExerciseIndex === activeWorkout.exercises.length - 1;
    if (isLast) {
      // תרגיל "מסתיים" בפועל רק כאן - בפעם הראשונה שעוברים הלאה ממנו לתרגיל חדש
      // (לכן זו הפעם היחידה שמפעילים מנוחה אוטומטית בין תרגילים)
      const newExercise: WorkoutExercise = { id: genId(), name: '', sets: [] };
      set({
        activeWorkout: { ...activeWorkout, exercises: [...activeWorkout.exercises, newExercise] },
        currentExerciseIndex: currentExerciseIndex + 1,
        rest: idleRest, // אין יותר מנוחה אוטומטית במעבר בין תרגילים
      });
    } else {
      set({ currentExerciseIndex: currentExerciseIndex + 1, rest: idleRest });
    }
  },

  goToPrevExercise: () => {
    const { currentExerciseIndex } = get();
    if (currentExerciseIndex === 0) return;
    set({ currentExerciseIndex: currentExerciseIndex - 1, rest: idleRest });
  },

  addSet: (reps, weight) => {
    const { activeWorkout, currentExerciseIndex, rest } = get();
    if (!activeWorkout) return { ok: false, error: 'אין אימון פעיל' };

    if (!Number.isFinite(reps) || reps <= 0 || !Number.isInteger(reps)) {
      return { ok: false, error: 'הזן מספר חזרות תקין (גדול מ-0)' };
    }
    if (!Number.isFinite(weight) || weight < 0) {
      return { ok: false, error: 'המשקל לא יכול להיות שלילי' };
    }

    const newSet: WorkoutSet = {
      id: genId(),
      reps,
      weight,
      restBeforeSeconds: rest.lastCompletedSeconds,
      timestamp: Date.now(),
    };

    const exercises = activeWorkout.exercises.map((ex, i) =>
      i === currentExerciseIndex ? { ...ex, sets: [...ex.sets, newSet] } : ex
    );

    set({
      activeWorkout: { ...activeWorkout, exercises },
      rest: startRestInternal(), // מנוחה מתחילה אוטומטית אחרי כל סט
    });

    return { ok: true };
  },

  deleteSet: (setId) => {
    const { activeWorkout, currentExerciseIndex, rest } = get();
    if (!activeWorkout) return;
    const exercise = activeWorkout.exercises[currentExerciseIndex];
    // אם מוחקים את הסט האחרון שנוסף - מבטלים גם את המנוחה שהתחילה בעקבותיו
    // (בין אם היא עדיין רצה ובין אם היא כבר הסתיימה ומחכה להיות משויכת לסט הבא).
    // מחיקת סט ישן יותר לא נוגעת במנוחה הנוכחית - היא לא שייכת אליו.
    const isLastSet = exercise?.sets[exercise.sets.length - 1]?.id === setId;
    const exercises = activeWorkout.exercises.map((ex, i) =>
      i === currentExerciseIndex ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
    );
    set({
      activeWorkout: { ...activeWorkout, exercises },
      rest: isLastSet ? idleRest : rest,
    });
  },

  extendRest: (seconds) => {
    const { rest } = get();
    if (!rest.isActive) return;
    set({ rest: { ...rest, targetSeconds: rest.targetSeconds + seconds } });
  },

  finishRestEarly: () => {
    const { rest } = get();
    if (!rest.isActive || rest.startedAt === null) return;
    const elapsed = Math.round((Date.now() - rest.startedAt) / 1000);
    set({
      rest: { isActive: false, targetSeconds: REST_SECONDS_DEFAULT, startedAt: null, lastCompletedSeconds: elapsed },
    });
  },

  completeRestNaturally: () => {
    const { rest } = get();
    if (!rest.isActive) return;
    set({
      rest: {
        isActive: false,
        targetSeconds: REST_SECONDS_DEFAULT,
        startedAt: null,
        lastCompletedSeconds: rest.targetSeconds,
      },
    });
  },
}));