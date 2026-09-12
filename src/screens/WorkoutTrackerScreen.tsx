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
import { saveWorkout } from '../lib/workoutService';
import { useRestSounds } from '../lib/sound';

// TODO: להחליף במזהה המשתמש האמיתי מתוך Firebase Auth
const CURRENT_USER_ID = 'demo-user';

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WorkoutTrackerScreen() {
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

  const lastBeepedSecond = useRef<number | null>(null);

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

    const tick = () => {
      const elapsedRest = Math.round((Date.now() - (rest.startedAt as number)) / 1000);
      const remaining = rest.targetSeconds - elapsedRest;

      if (remaining <= 0) {
        setRestRemaining(0);
        playDone();
        completeRestNaturally();
        return;
      }

      setRestRemaining(remaining);

      if (remaining <= 5 && lastBeepedSecond.current !== remaining) {
        lastBeepedSecond.current = remaining;
        playTick();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rest.isActive, rest.startedAt, rest.targetSeconds]);

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
    setWeightText('');
  };

  const handleNext = () => {
    const currentExercise = activeWorkout?.exercises[currentExerciseIndex];
    if (!currentExercise?.name.trim()) {
      Alert.alert('חסר שם תרגיל', 'יש להזין שם לתרגיל לפני שממשיכים הלאה');
      return;
    }
    goToNextExercise();
  };

  const handleFinish = async () => {
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

  if (!activeWorkout) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>מוכנים להתחיל?</Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => startWorkout(CURRENT_USER_ID)}
        >
          <Text style={styles.startButtonText}>התחל אימון</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentExercise = activeWorkout.exercises[currentExerciseIndex];
  const totalExercises = activeWorkout.exercises.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      {/* כותרת עליונה */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish} disabled={saving}>
          <Text style={styles.finishButtonText}>{saving ? 'שומר...' : 'סיים אימון'}</Text>
        </TouchableOpacity>
        <Text style={styles.timer}>{fmt(Math.floor(elapsed / 1000))}</Text>
      </View>

      {/* נקודות התקדמות + מספר תרגיל */}
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

      {/* כרטיס התרגיל הנוכחי */}
      <View style={styles.exerciseCard}>
        <TextInput
          style={styles.nameInput}
          placeholder="שם התרגיל (למשל: סקוואט)"
          placeholderTextColor="#888"
          value={currentExercise.name}
          onChangeText={setExerciseName}
        />

        {/* רשימת הסטים, עם שורות מנוחה ביניהם */}
        {currentExercise.sets.map((set, i) => (
          <React.Fragment key={set.id}>
            {i > 0 && set.restBeforeSeconds !== null && (
              <Text style={styles.restBetween}>⏱ מנוחה: {fmt(set.restBeforeSeconds)}</Text>
            )}
            <View style={styles.setRow}>
              <Text style={styles.setText}>
                סט {i + 1}: {set.reps} חזרות × {set.weight} ק"ג
              </Text>
            </View>
          </React.Fragment>
        ))}

        {/* מנוחה שהסתיימה אך עוד לא שויכה לסט הבא - מוצגת מיד */}
        {!rest.isActive && rest.lastCompletedSeconds !== null && currentExercise.sets.length > 0 && (
          <Text style={styles.restBetween}>⏱ מנוחה: {fmt(rest.lastCompletedSeconds)}</Text>
        )}

        {/* הוספת סט */}
        <View style={styles.addSetRow}>
          <TextInput
            style={styles.setInput}
            placeholder="חזרות"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            value={repsText}
            onChangeText={setRepsText}
          />
          <TextInput
            style={styles.setInput}
            placeholder="משקל (ק״ג)"
            placeholderTextColor="#888"
            keyboardType="decimal-pad"
            value={weightText}
            onChangeText={setWeightText}
          />
          <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
            <Text style={styles.addSetButtonText}>הוסף סט</Text>
          </TouchableOpacity>
        </View>
        {setError && <Text style={styles.errorText}>{setError}</Text>}

        {/* פאנל מנוחה פעילה */}
        {rest.isActive && (
          <View style={styles.restPanel}>
            <Text style={[styles.restCountdown, restRemaining <= 5 && styles.restCountdownUrgent]}>
              {fmt(restRemaining)}
            </Text>
            <View style={styles.restButtonsRow}>
              <TouchableOpacity style={styles.restExtendButton} onPress={extendRest}>
                <Text style={styles.restExtendButtonText}>+30 שניות</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.restFinishButton} onPress={finishRestEarly}>
                <Text style={styles.restFinishButtonText}>סיים מנוחה</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
        <TouchableOpacity style={styles.navButtonPrimary} onPress={handleNext}>
          <Text style={styles.navButtonPrimaryText}>
            {currentExerciseIndex === totalExercises - 1 ? 'תרגיל הבא +' : 'הבא ›'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f10' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f10',
  },
  title: { fontSize: 24, color: '#fff', marginBottom: 24, fontWeight: '600' },
  startButton: {
    backgroundColor: '#5b8cff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timer: { fontSize: 20, color: '#fff', fontWeight: '600' },
  finishButton: {
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  finishButtonText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3a3a3c' },
  dotActive: { backgroundColor: '#5b8cff' },
  positionText: { textAlign: 'center', color: '#888', fontSize: 12, marginBottom: 14 },

  exerciseCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 14,
  },
  nameInput: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingVertical: 8,
    marginBottom: 10,
  },

  setRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2c2c2e',
  },
  setText: { color: '#ddd', fontSize: 15 },
  restBetween: { textAlign: 'center', color: '#888', fontSize: 12, paddingVertical: 3 },

  addSetRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  setInput: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addSetButton: {
    backgroundColor: '#5b8cff',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addSetButtonText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#ff5b5b', fontSize: 12, marginTop: 6 },

  restPanel: { marginTop: 14, alignItems: 'center' },
  restCountdown: { fontSize: 26, fontWeight: '700', color: '#5b8cff', marginBottom: 8 },
  restCountdownUrgent: { color: '#ff5b5b' },
  restButtonsRow: { flexDirection: 'row', gap: 8, width: '100%' },
  restExtendButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  restExtendButtonText: { color: '#ccc', fontSize: 13 },
  restFinishButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  restFinishButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  navRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 24 },
  navButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonDisabled: { opacity: 0.4 },
  navButtonText: { color: '#ccc', fontSize: 14 },
  navButtonPrimary: {
    flex: 1,
    backgroundColor: '#5b8cff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
