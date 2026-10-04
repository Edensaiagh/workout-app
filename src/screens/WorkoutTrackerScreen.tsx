// src/screens/WorkoutTrackerScreen.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';
import { saveWorkout, getUserWorkouts } from '../lib/workoutService';
import { useRestSounds } from '../lib/sound';
import { haptics } from '../lib/haptics';
import { useAuth } from '../lib/authContext';
import { useConnectionStatus } from '../lib/network';
import { ConnectionBanner, OfflinePill } from '../components/ConnectionBanner';
import ExerciseNamePicker from '../components/ExerciseNamePicker';
import { WorkoutCompleteView } from '../components/WorkoutCompleteView';
import { StepperField } from '../components/StepperField';
import { getExerciseKind } from '../constants/exerciseLibrary';
import type { BrokenRecord } from '../lib/personalRecords';
import { Workout } from '../types/workout';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, iconSize, radius, spacing, touch, Text, useTheme } from '../theme';
import type { Palette } from '../theme';

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WorkoutTrackerScreen() {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // מסך זה נטען רק כשיש משתמש מחובר (ראה App.tsx), ולכן user בטוח לא null
  const { user } = useAuth();
  const userId = user!.uid;

  const {
    activeWorkout,
    currentExerciseIndex,
    rest,
    betweenExercisesStartedAt,
    startWorkout,
    finishWorkout,
    cancelWorkout,
    setExerciseName,
    goToNextExercise,
    goToPrevExercise,
    addSet,
    deleteSet,
    extendRest,
    finishRestEarly,
    completeRestNaturally,
  } = useWorkoutStore();

  const { playTick, playDone, primeDone } = useRestSounds();
  const connection = useConnectionStatus();

  const [elapsed, setElapsed] = useState(0);

  // שעון "מנוחה בין תרגילים" (ספירה קדימה) - רץ רק בתרגיל שעוד אין בו סטים
  const [betweenElapsed, setBetweenElapsed] = useState(0);
  useEffect(() => {
    if (betweenExercisesStartedAt === null) return;
    const update = () => setBetweenElapsed(Math.max(0, Math.round((Date.now() - betweenExercisesStartedAt) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [betweenExercisesStartedAt]);
  const [repsText, setRepsText] = useState(''); // חזרות (בדו-צדדי: ימין)
  const [repsLeftText, setRepsLeftText] = useState(''); // חזרות שמאל, רק בתרגיל דו-צדדי
  const [weightText, setWeightText] = useState(''); // משקל (בדו-צדדי: ימין)
  const [weightLeftText, setWeightLeftText] = useState(''); // משקל שמאל, רק בתרגיל דו-צדדי
  const lastWeights = useRef<Map<string, { right: number; left: number }>>(new Map());
  const [lastWeightsVersion, setLastWeightsVersion] = useState(0);
  const [setError, setSetError] = useState<string | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [nameEditorVisible, setNameEditorVisible] = useState(false);
  const [personalHistory, setPersonalHistory] = useState<string[]>([]);

  // מסך "אימון הושלם" - state מקומי מספיק (לא Zustand): ה-Tab.Navigator
  // משאיר מסכים מורכבים בזיכרון גם כשעוברים טאב, אז זה שורד מעבר בין טאבים
  // כל עוד לא סוגרים את האפליקציה לגמרי.
  const [completedWorkout, setCompletedWorkout] = useState<Workout | null>(null);
  const [completedSavedTo, setCompletedSavedTo] = useState<'cloud' | 'local'>('cloud');
  const [completedNewRecords, setCompletedNewRecords] = useState<BrokenRecord[]>([]);

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
    primeDone(); // מכינים את נגן הצליל מראש, כדי שיתחיל מיד בסיום המנוחה
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
          haptics.restDone();
          completeRestNaturally();
        }
        clearInterval(interval);
        return;
      }

      setRestRemaining(remaining);

      // רטט קל בכל אחת מ-3 השניות האחרונות (הטבעת נשארת אדומה מ-5 שניות, זה רק הרטט)
      if (remaining <= 3 && lastBeepedSecond.current !== remaining) {
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
    setRepsLeftText('');
    setSetError(null);
    const sets = currentExercise?.sets ?? [];
    const lastSet = sets[sets.length - 1];
    setWeightText(lastSet ? String(lastSet.weightRight ?? lastSet.weight) : '');
    setWeightLeftText(lastSet ? String(lastSet.weightLeft ?? lastSet.weight) : '');
  }, [currentExerciseIndex]);

  // כשבוחרים תרגיל שעוד אין בו סטים באימון הזה - מציעים את המשקל מהאימון הקודם שלו.
  // רץ אחרי האפקט שמאפס את הטופס (למעלה), ולכן ההצעה גוברת עליו.
  useEffect(() => {
    if (!currentExercise || currentExercise.sets.length > 0) return;
    const remembered = lastWeights.current.get(currentExercise.name.trim().toLowerCase());
    if (remembered !== undefined) {
      setWeightText(String(remembered.right));
      setWeightLeftText(String(remembered.left));
    }
  }, [currentExerciseIndex, currentExercise?.name, lastWeightsVersion]);

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

        // המשקל האחרון שנרשם לכל תרגיל (לפי שם), מהאימון האחרון שבו הוא הופיע.
        // האימונים ממוינים מהחדש לישן, אז ההופעה הראשונה היא האחרונה.
        const weights = new Map<string, { right: number; left: number }>();
        workouts.forEach((w) => {
          w.exercises.forEach((ex) => {
            const key = ex.name.trim().toLowerCase();
            const last = ex.sets[ex.sets.length - 1];
            if (key && last && !weights.has(key)) {
              weights.set(key, { right: last.weightRight ?? last.weight, left: last.weightLeft ?? last.weight });
            }
          });
        });
        lastWeights.current = weights;
        setLastWeightsVersion((v) => v + 1);
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

    const weightLeft = weightLeftText === '' ? 0 : parseFloat(weightLeftText);

    const result =
      exerciseKind === 'unilateral'
        ? addSet(reps, weight, {
            right: reps,
            left: parseInt(repsLeftText, 10),
            weightRight: weight,
            weightLeft,
          })
        : addSet(reps, weight);
    if (!result.ok) {
      setSetError(result.error);
      return;
    }
    haptics.tap();
    setSetError(null);
    setRepsText('');
    setRepsLeftText('');
    setWeightText(String(weight)); // מציעים אוטומטית את אותו משקל לסט הבא, ניתן לערוך
    if (exerciseKind === 'unilateral') setWeightLeftText(String(weightLeft));
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
    haptics.tap();
    goToNextExercise();
  };

  const doFinish = async () => {
    const completed = finishWorkout();
    if (!completed) {
      Alert.alert('אין מה לשמור', 'צריך להוסיף לפחות סט אחד לפני שמסיימים את האימון');
      return;
    }

    setSaving(true);
    try {
      const result = await saveWorkout(completed);
      // "נשמר בענן" מוצג עכשיו כבאנר בתוך מסך "אימון הושלם" עצמו, לא כ-Alert.
      // "נשמר מקומית" נשאר כ-Alert (מידע חשוב שכדאי לוודא שהמשתמשת ראתה).
      if (result.savedTo === 'local') {
        Alert.alert(
          'נשמר מקומית',
          'לא הצלחנו להתחבר לענן כרגע, אז שמרנו את האימון על המכשיר. הוא יסונכרן אוטומטית בפעם הבאה שיש רשת.'
        );
      }
      haptics.success();
      setCompletedWorkout(completed);
      setCompletedSavedTo(result.savedTo);
      setCompletedNewRecords(result.newRecords);
    } finally {
      setSaving(false);
    }
  };

  const handleStartNew = () => {
    setCompletedWorkout(null);
  };

  const handleFinish = () => {
    Alert.alert('סיימת את האימון?', 'לא ניתן יהיה להוסיף עוד סטים אחרי הסיום.', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'סיים אימון', style: 'destructive', onPress: doFinish },
    ]);
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'למחוק את האימון?',
      'כל הנתונים של האימון הנוכחי יימחקו לצמיתות ולא ניתן יהיה לשחזר אותם.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק אימון', style: 'destructive', onPress: cancelWorkout },
      ]
    );
  };

  if (completedWorkout) {
    return (
      <WorkoutCompleteView
        workout={completedWorkout}
        savedTo={completedSavedTo}
        userId={userId}
        newPRsCount={completedNewRecords.length}
        newRecords={completedNewRecords}
        onStartNew={handleStartNew}
        appName="Bizi 365"
      />
    );
  }

  if (!activeWorkout || !currentExercise) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>מוכנים להתחיל?</Text>
        <TouchableOpacity
          style={[common.primaryButton, styles.startButton]}
          onPress={() => startWorkout(userId)}
        >
          <Text style={[common.primaryButtonText, styles.startButtonText]}>התחל אימון</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalExercises = activeWorkout.exercises.length;

  const exerciseKind = getExerciseKind(currentExercise.name);
  const parsedReps = parseInt(repsText, 10);
  const parsedRepsLeft = parseInt(repsLeftText, 10);
  const parsedWeight = weightText === '' ? 0 : parseFloat(weightText);
  const parsedWeightLeft = weightLeftText === '' ? 0 : parseFloat(weightLeftText);
  const canAddSet =
    !rest.isActive &&
    repsText.trim() !== '' &&
    Number.isInteger(parsedReps) &&
    parsedReps > 0 &&
    (exerciseKind !== 'unilateral' || (Number.isInteger(parsedRepsLeft) && parsedRepsLeft > 0)) &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 0 &&
    (exerciseKind !== 'unilateral' || (Number.isFinite(parsedWeightLeft) && parsedWeightLeft >= 0));

  const nextDisabled = currentExercise.sets.length === 0 || rest.isActive;
  const restProgress =
    rest.isActive && rest.targetSeconds > 0
      ? Math.max(0, Math.min(1, restRemaining / rest.targetSeconds))
      : 0;

  if (rest.isActive) {
    return (
      <View style={styles.restOverlay}>
        <View style={styles.restOverlayHeader}>
          <TouchableOpacity style={styles.restSkipButton} onPress={finishRestEarly} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={styles.restSkipButtonText}>דלג על המנוחה</Text>
          </TouchableOpacity>
          <Text style={styles.restOverlayPosition}>
            תרגיל {currentExerciseIndex + 1} מתוך {totalExercises}
          </Text>
        </View>

        <OfflinePill status={connection} />

        <Text style={styles.restOverlayLabel}>מנוחה</Text>
        <Text style={styles.restOverlaySubtitle}>
          לפני סט {currentExercise.sets.length + 1}
        </Text>

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
              stroke={colors.surfaceHigh}
              strokeWidth={REST_RING_STROKE}
              fill="none"
            />
            <Circle
              cx={REST_RING_SIZE / 2}
              cy={REST_RING_SIZE / 2}
              r={REST_RING_RADIUS}
              stroke={restRemaining <= 5 ? colors.danger : colors.accentText}
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
            <Text style={styles.restCountdownHint}>שניות נותרו</Text>
          </View>
        </View>

        <View style={styles.restAddRow}>
          <TouchableOpacity style={[common.secondaryButton, styles.flexOne]} onPress={() => extendRest(10)}>
            <Text style={common.secondaryButtonText}>10+ שניות</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[common.secondaryButton, styles.flexOne]} onPress={() => extendRest(30)}>
            <Text style={common.secondaryButtonText}>30+ שניות</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={common.primaryButton} onPress={finishRestEarly}>
          <Text style={common.primaryButtonText}>סיים מנוחה</Text>
        </TouchableOpacity>

        <Text style={styles.restOverlayFooter}>בסיום המנוחה תעברי אוטומטית לטופס הסט הבא</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      {/* כותרת עליונה */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[common.iconButton, common.iconButtonDanger]}
            onPress={handleCancelWorkout}
            accessibilityLabel="מחיקת האימון"
          >
            <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
          </TouchableOpacity>
        </View>
        <View style={styles.clockGroup}>
          <View style={styles.clockDot} />
          <Text style={styles.timerLabel}>זמן אימון כולל</Text>
          <Text style={styles.timer}>{fmt(Math.floor(elapsed / 1000))}</Text>
        </View>
      </View>

      {/* אין חיבור: האימון ממשיך לעבוד ונשמר מקומית; כשהחיבור חוזר ההודעה הופכת לירוקה לכמה שניות */}
      <View style={styles.connectionBannerWrap}>
        <ConnectionBanner
          status={connection}
          body="האימון ממשיך כרגיל ונשמר על המכשיר. הוא יסונכרן כשהחיבור יחזור."
          restoredBody="האימון יישמר בענן בסיומו."
        />
      </View>

      {/* כרטיס התרגיל הנוכחי */}
      <View style={styles.exerciseCard}>
        <TouchableOpacity style={styles.nameRow} onPress={() => setNameEditorVisible(true)}>
          <View style={styles.nameWithTag}>
            <Text style={[styles.nameText, !currentExercise.name && styles.namePlaceholder, { flexShrink: 1 }]}>
              {currentExercise.name || 'שם התרגיל (הקש לעריכה)'}
            </Text>
            {exerciseKind !== 'regular' && (
              <View style={styles.kindTag}>
                <Text style={styles.kindTagText}>{exerciseKind === 'unilateral' ? 'דו-צדדי' : 'עם עזרה'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.nameChevron}>‹</Text>
        </TouchableOpacity>

        {currentExercise.sets.length === 0 && betweenExercisesStartedAt !== null && (
          <View style={styles.restDivider}>
            <View style={styles.restDividerLine} />
            <View style={styles.betweenPill}>
              <Ionicons name="timer-outline" size={iconSize.sm - 4} color={colors.accentText} />
              <Text style={styles.betweenPillText}>מנוחה בין תרגילים · {fmt(betweenElapsed)}</Text>
            </View>
            <View style={styles.restDividerLine} />
          </View>
        )}

        {currentExercise.sets.length === 0 && (
          <Text style={styles.emptyState}>הוסיפי סט ראשון כדי להמשיך</Text>
        )}

        {/* רשימת הסטים בסגנון צ'יפים, עם שורות מנוחה ביניהם */}
        {currentExercise.sets.map((set, i) => (
          <React.Fragment key={set.id}>
            {set.restBeforeSeconds !== null && (
              <View style={styles.restDivider}>
                <View style={styles.restDividerLine} />
                <Text style={styles.restDividerLabel}>
                  {i === 0 ? 'מנוחה בין תרגילים' : 'מנוחה'} {fmt(set.restBeforeSeconds)}
                </Text>
                <View style={styles.restDividerLine} />
              </View>
            )}
            <View style={styles.setRow}>
              <View style={styles.setIndex}>
                <Text style={styles.setIndexText}>{i + 1}</Text>
              </View>
              <View style={styles.setData}>
                {set.repsRight !== undefined && set.repsLeft !== undefined ? (
                  <>
                    <View style={[styles.setChip, { borderColor: colors.teal, borderWidth: 1 }]}>
                      <Text style={styles.setChipVal}>
                        {set.weightRight ?? set.weight}×{set.repsRight}
                      </Text>
                      <Text style={styles.setChipUnit}>ימין · ק״ג×חזרות</Text>
                    </View>
                    <View style={[styles.setChip, { borderColor: colors.purple, borderWidth: 1 }]}>
                      <Text style={styles.setChipVal}>
                        {set.weightLeft ?? set.weight}×{set.repsLeft}
                      </Text>
                      <Text style={styles.setChipUnit}>שמאל · ק״ג×חזרות</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.setChip}>
                      <Text style={styles.setChipVal}>{set.weight}</Text>
                      <Text style={styles.setChipUnit}>{exerciseKind === 'assisted' ? 'עזרה ק״ג' : 'ק״ג'}</Text>
                    </View>
                    <View style={styles.setChip}>
                      <Text style={styles.setChipVal}>{set.reps}</Text>
                      <Text style={styles.setChipUnit}>חזרות</Text>
                    </View>
                  </>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteSetButton}
                onPress={() => deleteSet(set.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.deleteSetText}>✕</Text>
              </TouchableOpacity>
            </View>
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
          {exerciseKind === 'unilateral' ? (
            <>
              <View style={styles.fieldRow}>
                <StepperField
                  label="משקל - ימין (ק״ג)"
                  value={weightText}
                  onChangeText={setWeightText}
                  step={2.5}
                  decimals={2}
                  keyboardType="decimal-pad"
                  borderColor={colors.teal}
                  minusLabel="הורדת משקל בצד ימין"
                  plusLabel="הוספת משקל בצד ימין"
                />
                <StepperField
                  label="משקל - שמאל (ק״ג)"
                  value={weightLeftText}
                  onChangeText={setWeightLeftText}
                  step={2.5}
                  decimals={2}
                  keyboardType="decimal-pad"
                  borderColor={colors.purple}
                  minusLabel="הורדת משקל בצד שמאל"
                  plusLabel="הוספת משקל בצד שמאל"
                />
              </View>
              <View style={styles.fieldRow}>
                <StepperField
                  label="חזרות - ימין"
                  value={repsText}
                  onChangeText={setRepsText}
                  step={1}
                  keyboardType="number-pad"
                  borderColor={colors.teal}
                  minusLabel="הורדת חזרה בצד ימין"
                  plusLabel="הוספת חזרה בצד ימין"
                />
                <StepperField
                  label="חזרות - שמאל"
                  value={repsLeftText}
                  onChangeText={setRepsLeftText}
                  step={1}
                  keyboardType="number-pad"
                  borderColor={colors.purple}
                  minusLabel="הורדת חזרה בצד שמאל"
                  plusLabel="הוספת חזרה בצד שמאל"
                />
              </View>
            </>
          ) : (
            <View style={styles.fieldRow}>
              <StepperField
                label={exerciseKind === 'assisted' ? 'עזרה במכונה (ק״ג)' : 'משקל (ק״ג)'}
                value={weightText}
                onChangeText={setWeightText}
                step={2.5}
                decimals={2}
                keyboardType="decimal-pad"
                borderColor={colors.info}
                minusLabel={exerciseKind === 'assisted' ? 'הורדת עזרה' : 'הורדת משקל'}
                plusLabel={exerciseKind === 'assisted' ? 'הוספת עזרה' : 'הוספת משקל'}
              />
              <StepperField
                label="חזרות"
                value={repsText}
                onChangeText={setRepsText}
                step={1}
                keyboardType="number-pad"
                borderColor={colors.teal}
                minusLabel="הורדת חזרה"
                plusLabel="הוספת חזרה"
              />
            </View>
          )}
          {exerciseKind === 'assisted' && (
            <Text style={styles.fieldHint}>פחות עזרה = תרגיל קשה יותר</Text>
          )}
          <Text style={styles.fieldHint}>
            {rest.isActive
              ? 'אפשר להוסיף סט חדש רק לאחר סיום המנוחה'
              : 'הערכים נשמרים מהסט הקודם. לחיצה ארוכה על + או − משנה מהר, ולחיצה על המספר פותחת מקלדת.'}
          </Text>
          {setError && <Text style={styles.errorText}>{setError}</Text>}
          <TouchableOpacity
            style={[common.primaryButton, !canAddSet && common.disabled]}
            onPress={handleAddSet}
            disabled={!canAddSet}
          >
            <Text style={common.primaryButtonText}>+ הוספת סט</Text>
          </TouchableOpacity>
        </View>
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

      {/* ניווט בין תרגילים - בעברית (RTL) "קודם" בימין ומצביע ימינה, "הבא" בשמאל ומצביע שמאלה */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navButton, currentExerciseIndex === 0 && styles.navButtonDisabled]}
          onPress={() => {
            haptics.tap();
            goToPrevExercise();
          }}
          disabled={currentExerciseIndex === 0}
        >
          <Ionicons name="chevron-forward" size={iconSize.md} color={colors.text} />
          <Text style={styles.navButtonText}>תרגיל קודם</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, nextDisabled && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={nextDisabled}
        >
          <Text style={styles.navButtonText}>תרגיל הבא</Text>
          <Ionicons
            name={currentExerciseIndex === totalExercises - 1 ? 'add' : 'chevron-back'}
            size={iconSize.md}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* סיום האימון - בתחתית המסך, רחוק מכפתורי הפעולה היומיומיים */}
      <TouchableOpacity
        style={[common.dangerButton, styles.finishButton]}
        onPress={handleFinish}
        disabled={saving}
      >
        <Text style={common.dangerButtonText}>{saving ? 'שומר...' : 'סיום אימון'}</Text>
      </TouchableOpacity>

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

const REST_RING_SIZE = 220;
const REST_RING_RADIUS = 96;
const REST_RING_STROKE = 14;
const REST_RING_CIRCUMFERENCE = 2 * Math.PI * REST_RING_RADIUS;

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  flexOne: { flex: 1 },
  title: { fontSize: 24, color: colors.text, marginBottom: spacing.xl, fontWeight: '600' },
  startButton: { paddingHorizontal: spacing.xxl + 8, minHeight: touch.buttonLarge },
  startButtonText: { fontSize: fontSize.lg + 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  connectionBannerWrap: { marginBottom: 12 },
  clockGroup: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  timerLabel: { color: colors.textDim, fontSize: 20, fontWeight: '600' },
  timer: { fontSize: 20, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  finishButton: { width: '100%', marginBottom: spacing.xl },

  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  nameText: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  namePlaceholder: { color: colors.textDim, fontWeight: '400' },
  nameWithTag: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  kindTag: {
    backgroundColor: colors.accentBadgeBg,
    borderWidth: 1,
    borderColor: colors.accentBadgeBorder,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  kindTagText: { color: colors.accentText, fontSize: 11, fontWeight: '700' },
  nameChevron: { color: colors.textDim, fontSize: 18 },

  emptyState: { textAlign: 'center', color: colors.textDim, fontSize: fontSize.sm, paddingVertical: 10 },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  setIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndexText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  setData: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  setChip: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 58,
  },
  setChipVal: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  setChipUnit: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginTop: 1 },
  deleteSetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSetText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '700' },

  restDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  restDividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  restDividerLabel: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: '600',
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },

  betweenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentBadgeBg,
    borderWidth: 1,
    borderColor: colors.accentBadgeBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  betweenPillText: { color: colors.accentText, fontSize: fontSize.xs, fontWeight: '600' },

  addSetForm: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    marginTop: spacing.sm,
  },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  fieldHint: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginBottom: 10 },
  errorText: { color: colors.danger, fontSize: 12, textAlign: 'center', marginBottom: spacing.sm },

  restOverlay: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  restOverlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restSkipButton: {
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restSkipButtonText: { color: colors.textDim, fontSize: fontSize.sm, fontWeight: '600' },
  restOverlayPosition: { color: colors.textDim, fontSize: fontSize.xs, fontWeight: '600' },
  restOverlayLabel: { textAlign: 'center', color: colors.textDim, fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.xs },
  restOverlaySubtitle: {
    textAlign: 'center',
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  restCountdownHint: { fontSize: 12, color: colors.textDim, fontWeight: '600', marginTop: spacing.xs },
  restOverlayFooter: { textAlign: 'center', color: colors.textFaint, fontSize: fontSize.xs, marginTop: 14 },
  restRingWrap: {
    width: REST_RING_SIZE,
    height: REST_RING_SIZE,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  restRingSvg: { transform: [{ rotate: '-90deg' }] },
  restRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  restCountdown: { fontSize: 34, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  restCountdownUrgent: { color: colors.danger },
  restAddRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 10 },

  bottomProgress: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.accent, width: 20, borderRadius: 4 },
  positionText: { color: colors.textDim, fontSize: fontSize.sm, fontWeight: '500' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: spacing.lg },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: touch.buttonLarge,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  navButtonDisabled: { opacity: 0.35 },
  navButtonText: { color: colors.text, fontSize: fontSize.md + 1, fontWeight: '600' },
});
