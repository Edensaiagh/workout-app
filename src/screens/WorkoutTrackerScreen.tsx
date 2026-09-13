// src/screens/WorkoutTrackerScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';
import { saveWorkout, getUserWorkouts } from '../lib/workoutService';
import { useRestSounds } from '../lib/sound';
import { useAuth } from '../lib/authContext';
import ExerciseNamePicker from '../components/ExerciseNamePicker';
import Svg, { Circle } from 'react-native-svg';

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WorkoutTrackerScreen() {
  // מסך זה נטען רק כשיש משתמש מחובר (ראה App.tsx), ולכן user בטוח לא null
  const { user } = useAuth();
  const userId = user!.uid;

  const {
    activeWorkout,
    currentExerciseIndex,
    rest,
    startWorkout,
    finishWorkout,
    setExerciseName,
    goToNextExercise,
    goToPrevExercise,
    addSet,
    deleteSet,
    extendRest,
    finishRestEarly,
    completeRestNaturally,
  } = useWorkoutStore();

  const { playTick, playDone } = useRestSounds();

  const [elapsed, setElapsed] = useState(0);
  const [repsText, setRepsText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [setError, setSetError] = useState<string | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [nameEditorVisible, setNameEditorVisible] = useState(false);
  const [personalHistory, setPersonalHistory] = useState<string[]>([]);

  const lastBeepedSecond = useRef<number | null>(null);

  const currentExercise = activeWorkout ? activeWorkout.exercises[currentExerciseIndex] : null;

  // שעון האימון הכולל
  useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - activeWorkout.startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout?.startedAt]);

  // טיימר המנוחה - מבוסס על Date.now() כדי לא לסטות גם אם האפליקציה עוברת ברקע
  useEffect(() => {
    if (!rest.isActive || rest.startedAt === null) return;

    lastBeepedSecond.current = null;
    // מגן מפני צפצוף חוזר: אם הטיק הבא רץ לפני שה-re-render עם isActive=false
    // הספיק להגיע (למשל כשהאפליקציה הייתה ברקע), לא נרצה לקרוא ל-playDone שוב.
    let doneFired = false;
    let interval: ReturnType<typeof setInterval>;

    const tick = () => {
      const elapsedRest = Math.round((Date.now() - (rest.startedAt as number)) / 1000);
      const remaining = rest.targetSeconds - elapsedRest;

      if (remaining <= 0) {
        setRestRemaining(0);
        if (!doneFired) {
          doneFired = true;
          playDone();
          completeRestNaturally();
        }
        clearInterval(interval);
        return;
      }

      setRestRemaining(remaining);

      if (remaining <= 5 && lastBeepedSecond.current !== remaining) {
        lastBeepedSecond.current = remaining;
        playTick();
      }
    };

    tick();
    interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rest.isActive, rest.startedAt, rest.targetSeconds]);

  // בכל מעבר לתרגיל אחר מאפסים את טופס הוספת הסט, ומציעים את המשקל האחרון שנרשם בו (אם יש)
  useEffect(() => {
    setRepsText('');
    setSetError(null);
    const sets = currentExercise?.sets ?? [];
    const lastSet = sets[sets.length - 1];
    setWeightText(lastSet ? String(lastSet.weight) : '');
  }, [currentExerciseIndex]);

  // היסטוריית שמות תרגילים אישית - לטאב "ההיסטוריה שלי" בעורך שם התרגיל
  useEffect(() => {
    if (!activeWorkout) return;
    let cancelled = false;
    getUserWorkouts(userId)
      .then((workouts) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const names: string[] = [];
        workouts.forEach((w) => {
          w.exercises.forEach((ex) => {
            const trimmed = ex.name.trim();
            if (trimmed && !seen.has(trimmed)) {
              seen.add(trimmed);
              names.push(trimmed);
            }
          });
        });
        setPersonalHistory(names);
      })
      .catch(() => {
        // ההיסטוריה היא נוחות בלבד - כשל בטעינה לא אמור להפריע לאימון
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkout?.id]);

  const handleAddSet = () => {
    const reps = parseInt(repsText, 10);
    const weight = weightText === '' ? 0 : parseFloat(weightText);

    const result = addSet(reps, weight);
    if (!result.ok) {
      setSetError(result.error);
      return;
    }
    setSetError(null);
    setRepsText('');
    setWeightText(String(weight)); // מציעים אוטומטית את אותו משקל לסט הבא, ניתן לערוך
  };

  const handleNext = () => {
    if (!currentExercise) return;
    if (rest.isActive) {
      Alert.alert('מנוחה פעילה', 'יש להמתין לסיום זמן המנוחה לפני מעבר לתרגיל הבא');
      return;
    }
    if (!currentExercise.name.trim()) {
      Alert.alert('חסר שם תרגיל', 'יש להזין שם לתרגיל לפני שממשיכים הלאה');
      return;
    }
    if (currentExercise.sets.length === 0) {
      Alert.alert('אין עדיין סטים', 'יש להוסיף לפחות סט אחד לפני מעבר לתרגיל הבא');
      return;
    }
    goToNextExercise();
  };

  const doFinish = async () => {
    const completed = finishWorkout();
    if (!completed) return;

    setSaving(true);
    try {
      const result = await saveWorkout(completed);
      if (result.savedTo === 'cloud') {
        Alert.alert('כל הכבוד!', 'האימון נשמר בהצלחה 💪');
      } else {
        Alert.alert(
          'נשמר מקומית',
          'לא הצלחנו להתחבר לענן כרגע, אז שמרנו את האימון על המכשיר. הוא יסונכרן אוטומטית בפעם הבאה שיש רשת.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    Alert.alert('סיימת את האימון?', 'לא ניתן יהיה להוסיף עוד סטים אחרי הסיום.', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'סיים אימון', style: 'destructive', onPress: doFinish },
    ]);
  };

  if (!activeWorkout || !currentExercise) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>מוכנים להתחיל?</Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => startWorkout(userId)}
        >
          <Text style={styles.startButtonText}>התחל אימון</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalExercises = activeWorkout.exercises.length;

  const parsedReps = parseInt(repsText, 10);
  const parsedWeight = weightText === '' ? 0 : parseFloat(weightText);
  const canAddSet =
    !rest.isActive &&
    repsText.trim() !== '' &&
    Number.isInteger(parsedReps) &&
    parsedReps > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 0;

  const nextDisabled = currentExercise.sets.length === 0 || rest.isActive;
  const restProgress =
    rest.isActive && rest.targetSeconds > 0
      ? Math.max(0, Math.min(1, restRemaining / rest.targetSeconds))
      : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      {/* כותרת עליונה */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish} disabled={saving}>
          <Text style={styles.finishButtonText}>{saving ? 'שומר...' : 'סיום אימון'}</Text>
        </TouchableOpacity>
        <View style={styles.clockGroup}>
          <View style={styles.clockDot} />
          <Text style={styles.timerLabel}>זמן אימון כולל</Text>
          <Text style={styles.timer}>{fmt(Math.floor(elapsed / 1000))}</Text>
        </View>
      </View>

      {/* כרטיס התרגיל הנוכחי */}
      <View style={styles.exerciseCard}>
        <TouchableOpacity style={styles.nameRow} onPress={() => setNameEditorVisible(true)}>
          <Text style={[styles.nameText, !currentExercise.name && styles.namePlaceholder]}>
            {currentExercise.name || 'שם התרגיל (הקש לעריכה)'}
          </Text>
          <Text style={styles.nameChevron}>‹</Text>
        </TouchableOpacity>

        {currentExercise.sets.length === 0 && (
          <Text style={styles.emptyState}>הוסיפי סט ראשון כדי להמשיך</Text>
        )}

        {/* רשימת הסטים בסגנון צ'יפים, עם שורות מנוחה ביניהם */}
        {currentExercise.sets.map((set, i) => (
          <React.Fragment key={set.id}>
            <View style={styles.setRow}>
              <View style={styles.setIndex}>
                <Text style={styles.setIndexText}>{i + 1}</Text>
              </View>
              <View style={styles.setData}>
                <View style={styles.setChip}>
                  <Text style={styles.setChipVal}>{set.weight}</Text>
                  <Text style={styles.setChipUnit}>ק״ג</Text>
                </View>
                <View style={styles.setChip}>
                  <Text style={styles.setChipVal}>{set.reps}</Text>
                  <Text style={styles.setChipUnit}>חזרות</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteSetButton}
                onPress={() => deleteSet(set.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteSetText}>✕</Text>
              </TouchableOpacity>
            </View>
            {set.restBeforeSeconds !== null && (
              <View style={styles.restDivider}>
                <View style={styles.restDividerLine} />
                <Text style={styles.restDividerLabel}>מנוחה {fmt(set.restBeforeSeconds)}</Text>
                <View style={styles.restDividerLine} />
              </View>
            )}
          </React.Fragment>
        ))}

        {/* מנוחה שהסתיימה אך עוד לא שויכה לסט הבא - מוצגת מיד */}
        {!rest.isActive && rest.lastCompletedSeconds !== null && currentExercise.sets.length > 0 && (
          <View style={styles.restDivider}>
            <View style={styles.restDividerLine} />
            <Text style={styles.restDividerLabel}>מנוחה {fmt(rest.lastCompletedSeconds)}</Text>
            <View style={styles.restDividerLine} />
          </View>
        )}

        {/* הוספת סט */}
        <View style={styles.addSetForm}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>משקל (ק״ג)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputWeight]}
                placeholder="0"
                placeholderTextColor="#5a5f68"
                keyboardType="decimal-pad"
                value={weightText}
                onChangeText={setWeightText}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>חזרות</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputReps]}
                placeholder="0"
                placeholderTextColor="#5a5f68"
                keyboardType="number-pad"
                value={repsText}
                onChangeText={setRepsText}
              />
            </View>
          </View>
          <Text style={styles.fieldHint}>
            {rest.isActive
              ? 'אפשר להוסיף סט חדש רק לאחר סיום המנוחה'
              : 'המשקל נשמר מהסט הקודם — אפשר לשנות'}
          </Text>
          {setError && <Text style={styles.errorText}>{setError}</Text>}
          <TouchableOpacity
            style={[styles.primaryButton, !canAddSet && styles.buttonDisabled]}
            onPress={handleAddSet}
            disabled={!canAddSet}
          >
            <Text style={styles.primaryButtonText}>+ הוספת סט</Text>
          </TouchableOpacity>
        </View>

        {/* פאנל מנוחה פעילה */}
        {rest.isActive && (
          <View style={styles.restPanel}>
            <Text style={styles.restLabel}>מנוחה</Text>
            <View style={styles.restRingWrap}>
              <Svg
                width={REST_RING_SIZE}
                height={REST_RING_SIZE}
                viewBox={`0 0 ${REST_RING_SIZE} ${REST_RING_SIZE}`}
                style={styles.restRingSvg}
              >
                <Circle
                  cx={REST_RING_SIZE / 2}
                  cy={REST_RING_SIZE / 2}
                  r={REST_RING_RADIUS}
                  stroke={COLOR_SURFACE_3}
                  strokeWidth={REST_RING_STROKE}
                  fill="none"
                />
                <Circle
                  cx={REST_RING_SIZE / 2}
                  cy={REST_RING_SIZE / 2}
                  r={REST_RING_RADIUS}
                  stroke={restRemaining <= 5 ? COLOR_DANGER : COLOR_ACCENT}
                  strokeWidth={REST_RING_STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${REST_RING_CIRCUMFERENCE} ${REST_RING_CIRCUMFERENCE}`}
                  strokeDashoffset={REST_RING_CIRCUMFERENCE * (1 - restProgress)}
                />
              </Svg>
              <View style={styles.restRingCenter}>
                <Text style={[styles.restCountdown, restRemaining <= 5 && styles.restCountdownUrgent]}>
                  {fmt(restRemaining)}
                </Text>
              </View>
            </View>
            <View style={styles.restAddRow}>
              <TouchableOpacity style={styles.secondaryButtonSmall} onPress={() => extendRest(10)}>
                <Text style={styles.secondaryButtonText}>+10 שניות</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButtonSmall} onPress={() => extendRest(30)}>
                <Text style={styles.secondaryButtonText}>+30 שניות</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={finishRestEarly}>
              <Text style={styles.primaryButtonText}>סיים מנוחה</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* מונה תרגיל + נקודות התקדמות - בתחתית, מעל כפתורי הניווט */}
      <View style={styles.bottomProgress}>
        <View style={styles.dotsRow}>
          {activeWorkout.exercises.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentExerciseIndex && styles.dotActive]}
            />
          ))}
        </View>
        <Text style={styles.positionText}>
          תרגיל {currentExerciseIndex + 1} מתוך {totalExercises}
        </Text>
      </View>

      {/* ניווט בין תרגילים */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navButton, currentExerciseIndex === 0 && styles.navButtonDisabled]}
          onPress={goToPrevExercise}
          disabled={currentExerciseIndex === 0}
        >
          <Text style={styles.navButtonText}>‹ תרגיל קודם</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, nextDisabled && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={nextDisabled}
        >
          <Text style={styles.navButtonText}>
            {currentExerciseIndex === totalExercises - 1 ? 'תרגיל הבא +' : 'תרגיל הבא ›'}
          </Text>
        </TouchableOpacity>
      </View>

      <ExerciseNamePicker
        visible={nameEditorVisible}
        currentName={currentExercise.name}
        personalHistory={personalHistory}
        onClose={() => setNameEditorVisible(false)}
        onConfirm={(name) => {
          setExerciseName(name);
          setNameEditorVisible(false);
        }}
      />
    </ScrollView>
  );
}

// ---- Design tokens (matching the approved interactive mockup) ----
const COLOR_BG = '#14161a';
const COLOR_SURFACE = '#1d2025';
const COLOR_SURFACE_2 = '#23262c';
const COLOR_SURFACE_3 = '#2b2f36';
const COLOR_TEXT = '#f2f3f5';
const COLOR_MUTED = '#8b929a';
const COLOR_ACCENT = '#f4c430';
const COLOR_LINE = '#33373e';
const COLOR_DANGER = '#e5636a';

const REST_RING_SIZE = 150;
const REST_RING_RADIUS = 65;
const REST_RING_STROKE = 10;
const REST_RING_CIRCUMFERENCE = 2 * Math.PI * REST_RING_RADIUS;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_BG },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR_BG,
  },
  title: { fontSize: 24, color: COLOR_TEXT, marginBottom: 24, fontWeight: '600' },
  startButton: {
    backgroundColor: COLOR_ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  startButtonText: { color: '#141414', fontSize: 18, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  clockGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLOR_DANGER,
  },
  timerLabel: { color: COLOR_MUTED, fontSize: 11, fontWeight: '600' },
  timer: { fontSize: 14, color: COLOR_TEXT, fontWeight: '700', fontVariant: ['tabular-nums'] },
  finishButton: {
    borderWidth: 1,
    borderColor: 'rgba(229,99,106,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  finishButtonText: { color: COLOR_DANGER, fontSize: 13, fontWeight: '700' },

  exerciseCard: {
    backgroundColor: COLOR_SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLOR_LINE,
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  nameText: { color: COLOR_TEXT, fontSize: 22, fontWeight: '700' },
  namePlaceholder: { color: COLOR_MUTED, fontWeight: '400' },
  nameChevron: { color: COLOR_MUTED, fontSize: 18 },

  emptyState: { textAlign: 'center', color: COLOR_MUTED, fontSize: 13, paddingVertical: 10 },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLOR_SURFACE,
    borderWidth: 1,
    borderColor: COLOR_LINE,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  setIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLOR_SURFACE_3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndexText: { color: COLOR_MUTED, fontSize: 12, fontWeight: '700' },
  setData: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  setChip: {
    backgroundColor: COLOR_SURFACE_2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 58,
  },
  setChipVal: { color: COLOR_TEXT, fontSize: 15, fontWeight: '700' },
  setChipUnit: { color: COLOR_MUTED, fontSize: 9, fontWeight: '600', marginTop: 1 },
  deleteSetButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(229,99,106,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSetText: { color: COLOR_DANGER, fontSize: 12, fontWeight: '700' },

  restDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  restDividerLine: { flex: 1, height: 1, backgroundColor: COLOR_LINE },
  restDividerLabel: {
    color: COLOR_MUTED,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: COLOR_SURFACE_3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },

  addSetForm: {
    backgroundColor: COLOR_SURFACE_2,
    borderWidth: 1,
    borderColor: COLOR_LINE,
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
  },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  fieldGroup: { flex: 1 },
  fieldLabel: { color: COLOR_MUTED, fontSize: 12, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  fieldInput: {
    backgroundColor: COLOR_SURFACE,
    borderWidth: 1.5,
    borderColor: COLOR_LINE,
    borderRadius: 12,
    paddingVertical: 10,
    color: COLOR_TEXT,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldInputWeight: { borderColor: '#4a90d9' },
  fieldInputReps: { borderColor: '#5bc490' },
  fieldHint: { color: COLOR_MUTED, fontSize: 10, textAlign: 'center', marginBottom: 10 },
  errorText: { color: COLOR_DANGER, fontSize: 12, textAlign: 'center', marginBottom: 8 },

  restPanel: { marginTop: 14, alignItems: 'center' },
  restLabel: { color: COLOR_MUTED, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  restRingWrap: {
    width: REST_RING_SIZE,
    height: REST_RING_SIZE,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restRingSvg: { transform: [{ rotate: '-90deg' }] },
  restRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  restCountdown: { fontSize: 34, fontWeight: '800', color: COLOR_TEXT, fontVariant: ['tabular-nums'] },
  restCountdownUrgent: { color: COLOR_DANGER },
  restAddRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 10 },

  primaryButton: {
    backgroundColor: COLOR_ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#141414', fontWeight: '700', fontSize: 15 },
  secondaryButtonSmall: {
    flex: 1,
    backgroundColor: COLOR_SURFACE,
    borderWidth: 1,
    borderColor: COLOR_LINE,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: { color: COLOR_TEXT, fontWeight: '600', fontSize: 13 },
  buttonDisabled: { opacity: 0.4 },

  bottomProgress: { alignItems: 'center', gap: 8, marginTop: 16 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLOR_LINE },
  dotActive: { backgroundColor: COLOR_ACCENT, width: 20, borderRadius: 4 },
  positionText: { color: COLOR_MUTED, fontSize: 13, fontWeight: '500' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 24 },
  navButton: {
    flex: 1,
    backgroundColor: COLOR_SURFACE_2,
    borderWidth: 1,
    borderColor: COLOR_LINE,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonDisabled: { opacity: 0.35 },
  navButtonText: { color: COLOR_TEXT, fontSize: 14, fontWeight: '600' },
});
