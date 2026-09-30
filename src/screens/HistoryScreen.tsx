import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Workout } from '../types/workout';
import { getUserWorkouts, deleteWorkout } from '../lib/workoutService';
import { getPersonalRecords, deletePersonalRecord, PersonalRecordsMap } from '../lib/personalRecords';
import { useAuth } from '../lib/authContext';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';
import { fontSize, iconSize, radius, spacing, touch, Text, useTheme } from '../theme';
import type { Palette } from '../theme';

const PR_COLLAPSED_COUNT = 4;

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

export default function HistoryScreen() {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // מסך זה נטען רק כשיש משתמש מחובר (ראה App.tsx), ולכן user בטוח לא null
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const userId = user!.uid;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const [personalRecords, setPersonalRecords] = useState<PersonalRecordsMap>({});
  const [prExpanded, setPrExpanded] = useState(false);
  const [manageVisible, setManageVisible] = useState(false);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = רשימה, 1 = פירוט
  const manageSlideAnim = useRef(new Animated.Value(0)).current; // 0 = רשימה, 1 = ניהול שיאים

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

  // שיאים אישיים - נטענים בנפרד מהאימונים עצמם (מסמך אחר, ראו lib/personalRecords.ts).
  // כישלון כאן לא אמור להפיל את שאר המסך - פשוט לא יוצג כרטיס השיאים הפעם.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getPersonalRecords(userId)
        .then((records) => {
          if (!cancelled) setPersonalRecords(records);
        })
        .catch(() => {
          // לא חוסמים את מסך ההיסטוריה בגלל זה - האימונים עצמם עדיין יוצגו כרגיל
        });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const grouped = useMemo(() => groupByMonth(workouts), [workouts]);

  // תרגילים ממוינים לפי העדכון האחרון (מי שיא נשבר לאחרונה מוצג קודם),
  // כדי ש"הצג עוד" לא יסתיר עדכון טרי מתחת לקיפול.
  const prExerciseNames = useMemo(
    () => Object.keys(personalRecords).sort((a, b) => personalRecords[b].updatedAt - personalRecords[a].updatedAt),
    [personalRecords]
  );
  const prVisibleNames = prExpanded ? prExerciseNames : prExerciseNames.slice(0, PR_COLLAPSED_COUNT);

  const openDetail = (workout: Workout) => {
    setSelectedWorkout(workout);
    Animated.timing(slideAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  };

  const closeDetail = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() =>
      setSelectedWorkout(null)
    );
  };

  const openManage = () => {
    setManageVisible(true);
    Animated.timing(manageSlideAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  };

  const closeManage = () => {
    Animated.timing(manageSlideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
      setManageVisible(false);
      setConfirmDeleteName(null); // לא נשאיר אישור מחיקה פתוח בפעם הבאה שנפתח את המסך
    });
  };

  // מחיקה ידנית של שיא בודד - לא קשורה בשום צורה למחיקת אימונים (ראו ההערה
  // המקבילה ב-deleteWorkout, workoutService.ts). לא מנסה "לנחש" שיא חלופי.
  const handleDeleteRecord = async (exerciseName: string) => {
    try {
      await deletePersonalRecord(userId, exerciseName);
      setPersonalRecords((prev) => {
        const next = { ...prev };
        delete next[exerciseName];
        return next;
      });
      setConfirmDeleteName(null);
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו למחוק את השיא. בדקי את החיבור ונסי שוב.');
    }
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
  const manageTranslate = manageSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [-400, 0] });

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View
        style={[styles.screen, { transform: [{ translateX: listTranslate }], opacity: listOpacity }]}
      >
        <View style={styles.topbar}>
          <Text style={common.pageTitle}>היסטוריה</Text>
          <Text style={common.pageSubtitle}>כל האימונים שלך במקום אחד</Text>
        </View>

        <View style={styles.prCard}>
          <View style={styles.prCardHead}>
            <View style={{ flex: 1 }}>
              <View style={styles.prTitleRow}>
                <Ionicons name="trophy" size={iconSize.sm} color={colors.accentText} />
                <Text style={styles.prTitle}>השיאים האישיים שלי</Text>
              </View>
              <Text style={styles.prSubtitle}>רק תרגילים מהרשימה הקבועה נספרים כאן</Text>
            </View>
            {prExerciseNames.length > 0 && (
              <TouchableOpacity style={styles.manageLink} onPress={openManage}>
                <Text style={styles.manageLinkText}>ניהול</Text>
              </TouchableOpacity>
            )}
          </View>

          {prExerciseNames.length === 0 ? (
            <Text style={styles.prEmptyText}>
              עוד אין שיאים - הם יופיעו כאן אחרי האימון הראשון בתרגיל מהרשימה הקבועה.
            </Text>
          ) : (
            <>
              {prVisibleNames.map((name, i) => {
                const r = personalRecords[name];
                return (
                  <View key={name} style={[styles.prRow, i === 0 && styles.prRowFirst]}>
                    <Text style={styles.prExerciseName}>{name}</Text>
                    <View style={styles.prValsRow}>
                      <View style={styles.prVal}>
                        <Text style={styles.prValNum}>{r.maxWeight.toLocaleString('he-IL')}</Text>
                        <Text style={styles.prValLabel}>ק"ג</Text>
                      </View>
                      <View style={styles.prVal}>
                        <Text style={styles.prValNum}>{r.maxReps}</Text>
                        <Text style={styles.prValLabel}>חזרות</Text>
                      </View>
                      <View style={styles.prVal}>
                        <Text style={styles.prValNum}>{r.maxSessionVolume.toLocaleString('he-IL')}</Text>
                        <Text style={styles.prValLabel}>נפח/אימון</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {prExerciseNames.length > PR_COLLAPSED_COUNT && (
                <TouchableOpacity style={styles.showMoreButton} onPress={() => setPrExpanded((v) => !v)}>
                  <Text style={styles.showMoreText}>
                    {prExpanded ? 'הצג פחות' : `הצג עוד (${prExerciseNames.length - PR_COLLAPSED_COUNT})`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {loading && (
          <View style={styles.centerFill}>
            <ActivityIndicator color={colors.accentText} />
          </View>
        )}

        {!loading && loadError && (
          <View style={styles.centerFill}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}

        {!loading && !loadError && workouts.length === 0 && (
          <View style={styles.centerFill}>
            <EmptyState
              icon="barbell-outline"
              title="עוד אין אימונים שמורים"
              subtitle="אחרי שתסיימי אימון ראשון, הוא יופיע כאן."
              actionLabel="התחל אימון"
              onAction={() => navigation.navigate('אימון')}
            />
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
                          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                          <Text style={styles.metricText}>{volume.toLocaleString()} ק"ג נפח</Text>
                        </View>
                        <View style={styles.metric}>
                          <View style={[styles.dot, { backgroundColor: colors.teal }]} />
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
              <TouchableOpacity style={common.backButton} onPress={closeDetail}>
                <Ionicons name="chevron-forward" size={iconSize.lg} color={colors.text} />
                <Text style={common.backButtonText}>חזרה</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[common.dangerButton, styles.deleteBtn]} onPress={() => confirmDeleteWorkout(selectedWorkout)}>
                <Ionicons name="trash-outline" size={iconSize.sm} color={colors.danger} />
                <Text style={common.dangerButtonText}>מחיקת אימון</Text>
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
              <Text style={[styles.dstatNum, { color: colors.accentText }]}>
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
                      <View style={styles.restBetween}>
                        <Ionicons name="timer-outline" size={iconSize.sm - 4} color={colors.textFaint} />
                        <Text style={styles.restBetweenText}>מנוחה: {fmtRest(set.restBeforeSeconds)}</Text>
                      </View>
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

      {manageVisible && (
        <Animated.View style={[styles.detailScreen, { transform: [{ translateX: manageTranslate }] }]}>
          <View style={styles.manageHeader}>
            <TouchableOpacity style={common.backButton} onPress={closeManage}>
              <Ionicons name="chevron-forward" size={iconSize.lg} color={colors.text} />
              <Text style={common.backButtonText}>חזרה</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.manageTitle}>ניהול שיאים</Text>
              <Text style={styles.manageSub}>מחיקת שיא כאן היא ידנית בלבד - לא קשורה למחיקת אימונים</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.manageList}>
            {prExerciseNames.length === 0 ? (
              <Text style={styles.manageEmptyText}>
                אין עדיין שיאים לנהל.{'\n'}הם יופיעו כאן ברגע שיישבר שיא ראשון.
              </Text>
            ) : (
              prExerciseNames.map((name) => {
                const r = personalRecords[name];
                if (confirmDeleteName === name) {
                  return (
                    <View key={name} style={styles.confirmInline}>
                      <Text style={styles.confirmText}>
                        למחוק את השיא של "{name}"? הפעולה לא ניתנת לביטול - השיא ייקבע מחדש רק באימון הבא שישבור
                        אותו.
                      </Text>
                      <View style={styles.confirmActions}>
                        <TouchableOpacity
                          style={[styles.confirmBtn, styles.confirmCancel]}
                          onPress={() => setConfirmDeleteName(null)}
                        >
                          <Text style={styles.confirmCancelText}>ביטול</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmBtn, styles.confirmDeleteBtn]}
                          onPress={() => handleDeleteRecord(name)}
                        >
                          <Text style={styles.confirmDeleteText}>מחיקת שיא</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
                return (
                  <View key={name} style={styles.manageRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.manageExName}>{name}</Text>
                      <Text style={styles.manageExVals}>
                        <Text style={styles.bold}>{r.maxWeight.toLocaleString('he-IL')}</Text> ק"ג{' · '}
                        <Text style={styles.bold}>{r.maxReps}</Text> חזרות{' · '}
                        <Text style={styles.bold}>{r.maxSessionVolume.toLocaleString('he-IL')}</Text> נפח/אימון
                      </Text>
                    </View>
                    <TouchableOpacity style={[common.iconButton, common.iconButtonDanger]} onPress={() => setConfirmDeleteName(name)}>
                      <Text style={[common.iconButtonText, common.iconButtonTextDanger]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, backgroundColor: colors.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  errorText: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  topbar: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: spacing.md },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  prCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 16,
  },
  prTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  prSubtitle: { fontSize: 12, color: colors.textFaint, marginTop: 2, marginBottom: 12 },
  prEmptyText: { fontSize: 12.5, color: colors.textFaint, textAlign: 'center', lineHeight: 18, paddingVertical: 4 },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  prRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  prExerciseName: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  prValsRow: { flexDirection: 'row', gap: 14 },
  prVal: { alignItems: 'center', minWidth: 40 },
  prValNum: { fontSize: 13, fontWeight: '700', color: colors.accentText },
  prValLabel: { fontSize: 11, color: colors.textFaint, marginTop: 1 },
  // אותו סגנון "הצג עוד" שכבר קיים ב-AnalysisScreen.tsx - מסגרת בלבד, בלי מילוי
  showMoreButton: { marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  showMoreText: { color: colors.textDim, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  monthLabel: { fontSize: 13, fontWeight: '700', color: colors.textFaint, paddingVertical: 10 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDate: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardDay: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  durationBadge: { backgroundColor: colors.surfaceHigh, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  durationText: { fontSize: 13, color: colors.textDim, fontWeight: '600' },
  cardExercisesTitle: {
    fontSize: 13,
    color: colors.textDim,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  exerciseBullets: { marginTop: 6, alignItems: 'flex-start' },
  exerciseBulletText: { fontSize: 13, color: colors.textDim, alignSelf: 'flex-start', lineHeight: 19 },
  bold: { color: colors.text, fontWeight: '600' },
  cardBottom: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metricText: { fontSize: 12.5, color: colors.textDim, fontWeight: '600' },

  detailScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  detailHeader: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  deleteBtn: { flexDirection: 'row', gap: 6, minHeight: touch.min, paddingHorizontal: spacing.md },
  detailTitle: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', alignSelf: 'center' },
  detailSub: { fontSize: 13, color: colors.textDim, marginTop: 3, textAlign: 'center', alignSelf: 'center' },
  detailStats: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16 },
  dstat: { flex: 1, alignItems: 'center' },
  dstatNum: { fontSize: 20, fontWeight: '800', color: colors.text },
  dstatLabel: { fontSize: 11, color: colors.textFaint, marginTop: 3 },
  detailList: { paddingHorizontal: 20, paddingBottom: 30 },
  exBlock: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  exName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10, textAlign: 'center', alignSelf: 'center' },
  restBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 3 },
  restBetweenText: { color: colors.textFaint, fontSize: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  setNum: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumText: { fontSize: 12, fontWeight: '700', color: colors.textFaint },
  setDetail: { fontSize: 13.5, color: colors.textDim },

  // ---- כרטיס השיאים: כותרת + כפתור ניהול ----
  prCardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  manageLink: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  manageLinkText: { color: colors.accentText, fontSize: 12, fontWeight: '700' },

  // ---- מסך ניהול שיאים (אותו דפוס בדיוק כמו detailScreen/detailHeader) ----
  manageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 6 },
  manageTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  manageSub: { fontSize: 12, color: colors.textFaint, marginTop: 1, maxWidth: 260 },
  manageList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  manageEmptyText: { color: colors.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 20, paddingTop: 30 },

  manageRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  manageExName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  manageExVals: { fontSize: 12, color: colors.textFaint },

  confirmInline: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  confirmText: { fontSize: 12.5, color: colors.dangerText, lineHeight: 18, marginBottom: 10 },
  confirmActions: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  confirmCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  confirmCancelText: { color: colors.textDim, fontSize: 12.5, fontWeight: '700' },
  confirmDeleteBtn: { backgroundColor: colors.danger },
  confirmDeleteText: { color: colors.white, fontSize: 12.5, fontWeight: '700' },
});
