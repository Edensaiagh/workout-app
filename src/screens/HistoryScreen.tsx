import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Workout } from '../types/workout';
import { getUserWorkouts, deleteWorkout } from '../lib/workoutService';
import { useAuth } from '../lib/authContext';

// ---------------------------------------------------------------
// עזרי חישוב - מבוססים על הטיפוסים האמיתיים מ-types/workout.ts:
// Workout.startedAt / finishedAt הם timestamps (מספרים), לא מחרוזות תאריך,
// ו-totalVolume הוא אופציונלי (מחושב בסיום האימון, אבל ליתר ביטחון יש נפילה לחישוב ידני).
// ---------------------------------------------------------------
function calcVolume(workout: Workout): number {
  if (typeof workout.totalVolume === 'number') return workout.totalVolume;
  return workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0
  );
}

function calcSetCount(workout: Workout): number {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

function calcDurationMinutes(workout: Workout): number | null {
  if (!workout.finishedAt) return null;
  return Math.round((workout.finishedAt - workout.startedAt) / 60000);
}

function fmtRest(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatHebrewDate(timestampMs: number) {
  const d = new Date(timestampMs);
  const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
  const months = [
    'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
    'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
  ];
  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ];
  return {
    dateLabel: `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`,
    timeLabel: d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    monthLabel: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
  };
}

function groupByMonth(workouts: Workout[]) {
  const groups: { monthLabel: string; items: Workout[] }[] = [];
  workouts.forEach((w) => {
    const { monthLabel } = formatHebrewDate(w.startedAt);
    let group = groups.find((g) => g.monthLabel === monthLabel);
    if (!group) {
      group = { monthLabel, items: [] };
      groups.push(group);
    }
    group.items.push(w);
  });
  return groups;
}

// צבעים - תואם למוקאפ שאושר
const COLORS = {
  bg: '#17181c',
  panel: '#1f2126',
  panelRaised: '#26282f',
  hairline: '#33353c',
  text: '#f1f0ec',
  textDim: '#9a9ca4',
  textFaint: '#64666f',
  amber: '#ffb454',
  teal: '#5fd0c0',
};

export default function HistoryScreen() {
  // מסך זה נטען רק כשיש משתמש מחובר (ראה App.tsx), ולכן user בטוח לא null
  const { user } = useAuth();
  const userId = user!.uid;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = רשימה, 1 = פירוט

  // רשימת הטאבים נשארת מורכבת (mounted) גם כשעוברים לטאב אחר, אז אם היינו טוענים
  // רק ב-mount, אימון שהסתיים אחרי הביקור הראשון בטאב הזה לא היה מופיע בלי לרענן
  // ידנית. לכן טוענים מחדש כל פעם שהטאב חוזר לפוקוס.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getUserWorkouts(userId)
        .then((data) => {
          if (cancelled) return;
          // מציגים בהיסטוריה רק אימונים שהסתיימו - לא כאלה שנפתחו ולא הושלמו
          setWorkouts(data.filter((w) => w.status === 'completed'));
          setLoadError(null);
        })
        .catch(() => {
          if (!cancelled) setLoadError('לא הצלחנו לטעון את ההיסטוריה. בדקי את החיבור ונסי שוב.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const grouped = useMemo(() => groupByMonth(workouts), [workouts]);

  const openDetail = (workout: Workout) => {
    setSelectedWorkout(workout);
    Animated.timing(slideAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  };

  const closeDetail = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() =>
      setSelectedWorkout(null)
    );
  };

  const confirmDeleteWorkout = (workout: Workout) => {
    Alert.alert(
      'מחיקת אימון',
      'האימון יימחק לצמיתות ולא ניתן יהיה לשחזר אותו. להמשיך?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחיקה',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkout(workout.id);
              setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
              closeDetail();
            } catch {
              Alert.alert('שגיאה', 'לא הצלחנו למחוק את האימון. בדקי את החיבור ונסי שוב.');
            }
          },
        },
      ]
    );
  };

  // בעברית (RTL) המסך החדש נכנס מהצד השמאלי, והרשימה נדחקת מעט ימינה מאחוריו
  const detailTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-400, 0] });
  const listTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const listOpacity = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View
        style={[styles.screen, { transform: [{ translateX: listTranslate }], opacity: listOpacity }]}
      >
        <View style={styles.topbar}>
          <Text style={styles.h1}>היסטוריה</Text>
          <Text style={styles.subtitle}>כל האימונים שלך במקום אחד</Text>
        </View>

        {loading && (
          <View style={styles.centerFill}>
            <ActivityIndicator color={COLORS.amber} />
          </View>
        )}

        {!loading && loadError && (
          <View style={styles.centerFill}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}

        {!loading && !loadError && workouts.length === 0 && (
          <View style={styles.centerFill}>
            <Text style={styles.emptyText}>עוד אין אימונים שמורים. אחרי שתסיימי אימון ראשון, הוא יופיע כאן.</Text>
          </View>
        )}

        {!loading && !loadError && workouts.length > 0 && (
          <ScrollView contentContainerStyle={styles.list}>
            {grouped.map((group) => (
              <View key={group.monthLabel}>
                <Text style={styles.monthLabel}>{group.monthLabel}</Text>
                {group.items.map((workout) => {
                  const { dateLabel, timeLabel } = formatHebrewDate(workout.startedAt);
                  const durationMinutes = calcDurationMinutes(workout);
                  const volume = calcVolume(workout);
                  const setCount = calcSetCount(workout);
                  return (
                    <TouchableOpacity
                      key={workout.id}
                      style={styles.card}
                      activeOpacity={0.85}
                      onPress={() => openDetail(workout)}
                    >
                      <View style={styles.cardTop}>
                        <View>
                          <Text style={styles.cardDate}>{dateLabel}</Text>
                          <Text style={styles.cardDay}>{timeLabel}</Text>
                        </View>
                        {durationMinutes !== null && (
                          <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>{durationMinutes} דק'</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardExercisesTitle}>
                        <Text style={styles.bold}>{workout.exercises.length} תרגילים</Text>
                      </Text>
                      <View style={styles.exerciseBullets}>
                        {workout.exercises.map((e) => (
                          <Text key={e.id} style={styles.exerciseBulletText}>
                            {'• '}
                            {e.name}
                          </Text>
                        ))}
                      </View>
                      <View style={styles.cardBottom}>
                        <View style={styles.metric}>
                          <View style={[styles.dot, { backgroundColor: COLORS.amber }]} />
                          <Text style={styles.metricText}>{volume.toLocaleString()} ק"ג נפח</Text>
                        </View>
                        <View style={styles.metric}>
                          <View style={[styles.dot, { backgroundColor: COLORS.teal }]} />
                          <Text style={styles.metricText}>{setCount} סטים</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>

      {selectedWorkout && (
        <Animated.View style={[styles.detailScreen, { transform: [{ translateX: detailTranslate }] }]}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderTop}>
              <TouchableOpacity style={styles.backBtn} onPress={closeDetail}>
                <Text style={styles.backArrow}>›</Text>
                <Text style={styles.backText}>חזרה</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteWorkout(selectedWorkout)}>
                <Text style={styles.deleteText}>מחיקת אימון</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.detailTitle}>{formatHebrewDate(selectedWorkout.startedAt).dateLabel}</Text>
            <Text style={styles.detailSub}>
              {formatHebrewDate(selectedWorkout.startedAt).timeLabel}
              {calcDurationMinutes(selectedWorkout) !== null
                ? ` · ${calcDurationMinutes(selectedWorkout)} דקות`
                : ''}
            </Text>
          </View>

          <View style={styles.detailStats}>
            <View style={styles.dstat}>
              <Text style={[styles.dstatNum, { color: COLORS.amber }]}>
                {calcVolume(selectedWorkout).toLocaleString()}
              </Text>
              <Text style={styles.dstatLabel}>ק"ג נפח כולל</Text>
            </View>
            <View style={styles.dstat}>
              <Text style={styles.dstatNum}>{calcSetCount(selectedWorkout)}</Text>
              <Text style={styles.dstatLabel}>סטים</Text>
            </View>
            <View style={styles.dstat}>
              <Text style={styles.dstatNum}>{selectedWorkout.exercises.length}</Text>
              <Text style={styles.dstatLabel}>תרגילים</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.detailList}>
            {selectedWorkout.exercises.map((ex) => (
              <View key={ex.id} style={styles.exBlock}>
                <Text style={styles.exName}>{ex.name}</Text>
                {ex.sets.map((set, i) => (
                  <React.Fragment key={set.id}>
                    {i > 0 && set.restBeforeSeconds !== null && (
                      <Text style={styles.restBetween}>⏱ מנוחה: {fmtRest(set.restBeforeSeconds)}</Text>
                    )}
                    <View style={styles.setRow}>
                      <View style={styles.setNum}>
                        <Text style={styles.setNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.setDetail}>
                        <Text style={styles.bold}>{set.reps}</Text> חזרות{' · '}
                        <Text style={styles.bold}>{set.weight}</Text> ק"ג
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  errorText: { color: COLORS.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyText: { color: COLORS.textFaint, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  topbar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, alignItems: 'center' },
  h1: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textDim, marginTop: 2, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  monthLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textFaint, paddingVertical: 10, textAlign: 'right' },
  card: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDate: { fontSize: 15, fontWeight: '700', color: COLORS.text, textAlign: 'right' },
  cardDay: { fontSize: 12, color: COLORS.textFaint, marginTop: 2, textAlign: 'right' },
  durationBadge: { backgroundColor: COLORS.panelRaised, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  durationText: { fontSize: 13, color: COLORS.textDim, fontWeight: '600' },
  cardExercisesTitle: {
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: 12,
    textAlign: 'right',
    alignSelf: 'flex-start',
  },
  exerciseBullets: { marginTop: 6, alignItems: 'flex-start' },
  exerciseBulletText: { fontSize: 13, color: COLORS.textDim, textAlign: 'right', alignSelf: 'flex-start', lineHeight: 19 },
  bold: { color: COLORS.text, fontWeight: '600' },
  cardBottom: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metricText: { fontSize: 12.5, color: COLORS.textDim, fontWeight: '600' },

  detailScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.bg },
  detailHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow: { color: COLORS.textDim, fontSize: 20, fontWeight: '700' },
  backText: { color: COLORS.textDim, fontSize: 14, fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  deleteText: { color: '#e0645a', fontSize: 13, fontWeight: '600' },
  detailTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center', alignSelf: 'center' },
  detailSub: { fontSize: 13, color: COLORS.textDim, marginTop: 3, textAlign: 'center', alignSelf: 'center' },
  detailStats: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16 },
  dstat: { flex: 1, alignItems: 'center' },
  dstatNum: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  dstatLabel: { fontSize: 10.5, color: COLORS.textFaint, marginTop: 3 },
  detailList: { paddingHorizontal: 20, paddingBottom: 30 },
  exBlock: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  exName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, textAlign: 'center', alignSelf: 'center' },
  restBetween: { textAlign: 'center', alignSelf: 'center', color: COLORS.textFaint, fontSize: 12, paddingVertical: 3 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  setNum: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: COLORS.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textFaint },
  setDetail: { fontSize: 13.5, color: COLORS.textDim },
});
