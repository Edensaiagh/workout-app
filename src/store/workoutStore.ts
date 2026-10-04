// src/store/workoutStore.ts
// ניהול המצב של האימון הפעיל - הכל בזיכרון, נשמר ל-Firestore רק בסיום
// (ואם השמירה נכשלת - נופל לאחסון מקומי, ראו lib/localBackup.ts)

import { create } from 'zustand';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/workout';
import { exerciseVolume } from '../lib/setMath';
import type { PlannedSet, WorkoutPlan } from '../types/plan';

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
  // שעון "מנוחה בין תרגילים" (ספירה קדימה): מתי הסתיים הסט האחרון בתרגיל הקודם.
  // פעיל רק בתרגיל שעוד אין בו סטים, ונעצר (מתאפס) כשמוסיפים את הסט הראשון בו.
  betweenExercisesStartedAt: number | null;
  // כשהאימון התחיל מאימון שמור: הסטים המתוכננים לכל תרגיל (לפי מזהה התרגיל באימון). לא נשמר ל-Firestore
  plannedSets: Record<string, PlannedSet[]>;
  planName: string | null;

  // אימון
  startWorkout: (userId: string) => void;
  startWorkoutFromPlan: (userId: string, plan: WorkoutPlan) => void;
  finishWorkout: () => Workout | null;
  cancelWorkout: () => void;

  // ניווט בין תרגילים
  setExerciseName: (name: string) => void;
  goToNextExercise: () => void;
  goToPrevExercise: () => void;
  goToExercise: (index: number) => void; // קפיצה לכל תרגיל (אימון שלא לפי הסדר)

  // סטים
  // sides: רק בתרגיל דו-צדדי. אז reps נשמר כסכום שני הצדדים, weight כמקסימום משני המשקלים,
  // ו-repsRight/repsLeft/weightRight/weightLeft נשמרים בנפרד
  addSet: (reps: number, weight: number, sides?: { right: number; left: number; weightRight: number; weightLeft: number }) => { ok: true } | { ok: false; error: string };
  deleteSet: (setId: string) => void;

  // מנוחה
  extendRest: (seconds: number) => void;
  finishRestEarly: () => void;
  completeRestNaturally: () => void; // נקרא כשהספירה מגיעה ל-0
}

const genId = () => Math.random().toString(36).slice(2, 10);

// הזמן של הסט האחרון שבוצע בכל האימון (null אם עוד לא בוצע סט)
function lastSetTimestamp(workout: Workout): number | null {
  let latest: number | null = null;
  workout.exercises.forEach((ex) =>
    ex.sets.forEach((s) => {
      if (latest === null || s.timestamp > latest) latest = s.timestamp;
    })
  );
  return latest;
}

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
  betweenExercisesStartedAt: null,
  plannedSets: {},
  planName: null,

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
    set({ activeWorkout: newWorkout, currentExerciseIndex: 0, rest: idleRest, betweenExercisesStartedAt: null, plannedSets: {}, planName: null });
  },

  startWorkoutFromPlan: (userId, plan) => {
    const exercises: WorkoutExercise[] = plan.exercises.map((pe) => ({ id: genId(), name: pe.name, sets: [] }));
    if (exercises.length === 0) exercises.push({ id: genId(), name: '', sets: [] });
    const plannedSets: Record<string, PlannedSet[]> = {};
    plan.exercises.forEach((pe, i) => {
      plannedSets[exercises[i].id] = pe.sets;
    });
    const newWorkout: Workout = {
      id: genId(),
      userId,
      startedAt: Date.now(),
      finishedAt: null,
      exercises,
      status: 'active',
    };
    set({
      activeWorkout: newWorkout,
      currentExerciseIndex: 0,
      rest: idleRest,
      betweenExercisesStartedAt: null,
      plannedSets,
      planName: plan.name,
    });
  },

  finishWorkout: () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return null;

    // מסננים תרגילים ריקים (בלי שם או בלי סטים) שנוצרו אבל לא מולאו
    // ומסדרים לפי הסדר שבו בפועל התחילו (אימון מתוכנית יכול להתבצע לא לפי הסדר),
    // כדי שההיסטוריה והמנוחה בין התרגילים יוצגו נכון
    const cleanExercises = activeWorkout.exercises
      .filter((ex) => ex.name.trim().length > 0 && ex.sets.length > 0)
      .sort((a, b) => a.sets[0].timestamp - b.sets[0].timestamp);

    // אם אחרי הסינון לא נשאר כלום - אין מה לשמור. לא מאפסים את האימון הפעיל,
    // כדי שהמשתמשת תוכל להמשיך ולהוסיף סטים ולנסות לסיים שוב.
    if (cleanExercises.length === 0) {
      return null;
    }

    const totalVolume = cleanExercises.reduce((sum, ex) => {
      return sum + exerciseVolume(ex.name, ex.sets);
    }, 0);

    const completedWorkout: Workout = {
      ...activeWorkout,
      exercises: cleanExercises,
      finishedAt: Date.now(),
      status: 'completed',
      totalVolume,
    };

    set({ activeWorkout: null, currentExerciseIndex: 0, rest: idleRest, betweenExercisesStartedAt: null, plannedSets: {}, planName: null });
    return completedWorkout;
  },

  cancelWorkout: () => {
    set({ activeWorkout: null, currentExerciseIndex: 0, rest: idleRest, betweenExercisesStartedAt: null, plannedSets: {}, planName: null });
  },

  setExerciseName: (name) => {
    const { activeWorkout, currentExerciseIndex } = get();
    if (!activeWorkout) return;
    const exercises = activeWorkout.exercises.map((ex, i) =>
      i === currentExerciseIndex ? { ...ex, name } : ex
    );
    set({ activeWorkout: { ...activeWorkout, exercises } });
  },

  // המנוחה בין תרגילים נמדדת מהסט האחרון שבוצע באימון כולו (בכל תרגיל), כך שהיא נכונה
  // גם כשעוברים בין תרגילים לא לפי הסדר. השעון נעצר כשמוסיפים סט.
  goToExercise: (index) => {
    const { activeWorkout, currentExerciseIndex } = get();
    if (!activeWorkout || index === currentExerciseIndex) return;
    if (index < 0 || index >= activeWorkout.exercises.length) return;
    const lastSetEndedAt = lastSetTimestamp(activeWorkout);
    set({ currentExerciseIndex: index, rest: idleRest, betweenExercisesStartedAt: lastSetEndedAt });
  },

  goToNextExercise: () => {
    const { activeWorkout, currentExerciseIndex, goToExercise } = get();
    if (!activeWorkout) return;

    const isLast = currentExerciseIndex === activeWorkout.exercises.length - 1;
    if (isLast) {
      const newExercise: WorkoutExercise = { id: genId(), name: '', sets: [] };
      set({
        activeWorkout: { ...activeWorkout, exercises: [...activeWorkout.exercises, newExercise] },
        currentExerciseIndex: currentExerciseIndex + 1,
        rest: idleRest, // אין מנוחה עם ספירה לאחור במעבר בין תרגילים
        betweenExercisesStartedAt: lastSetTimestamp(activeWorkout),
      });
    } else {
      goToExercise(currentExerciseIndex + 1);
    }
  },

  goToPrevExercise: () => {
    const { currentExerciseIndex, goToExercise } = get();
    if (currentExerciseIndex === 0) return;
    goToExercise(currentExerciseIndex - 1);
  },

  addSet: (reps, weight, sides) => {
    const { activeWorkout, currentExerciseIndex, rest, betweenExercisesStartedAt } = get();
    if (!activeWorkout) return { ok: false, error: 'אין אימון פעיל' };

    if (sides) {
      const valid = (n: number) => Number.isInteger(n) && n > 0;
      if (!valid(sides.right) || !valid(sides.left)) {
        return { ok: false, error: 'הזן מספר חזרות תקין (גדול מ-0) לימין ולשמאל' };
      }
      const validWeight = (n: number) => Number.isFinite(n) && n >= 0;
      if (!validWeight(sides.weightRight) || !validWeight(sides.weightLeft)) {
        return { ok: false, error: 'המשקל לא יכול להיות שלילי' };
      }
      reps = sides.right + sides.left;
      weight = Math.max(sides.weightRight, sides.weightLeft);
    } else if (!Number.isFinite(reps) || reps <= 0 || !Number.isInteger(reps)) {
      return { ok: false, error: 'הזן מספר חזרות תקין (גדול מ-0)' };
    }
    if (!Number.isFinite(weight) || weight < 0) {
      return { ok: false, error: 'המשקל לא יכול להיות שלילי' };
    }

    // הסט הראשון אחרי מעבר לתרגיל: המנוחה שלפניו היא הזמן שעבר מהסט האחרון שבוצע באימון
    const now = Date.now();
    const restBeforeSeconds =
      betweenExercisesStartedAt !== null
        ? Math.max(0, Math.round((now - betweenExercisesStartedAt) / 1000))
        : rest.lastCompletedSeconds;

    const newSet: WorkoutSet = {
      id: genId(),
      reps,
      weight,
      restBeforeSeconds,
      timestamp: now,
      ...(sides
        ? { repsRight: sides.right, repsLeft: sides.left, weightRight: sides.weightRight, weightLeft: sides.weightLeft }
        : {}),
    };

    const exercises = activeWorkout.exercises.map((ex, i) =>
      i === currentExerciseIndex ? { ...ex, sets: [...ex.sets, newSet] } : ex
    );

    set({
      activeWorkout: { ...activeWorkout, exercises },
      rest: startRestInternal(), // מנוחה מתחילה אוטומטית אחרי כל סט
      betweenExercisesStartedAt: null,
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