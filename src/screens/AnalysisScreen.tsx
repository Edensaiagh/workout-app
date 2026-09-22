// src/screens/AnalysisScreen.tsx
//
// מסך ניתוח והתקדמות - מבוסס אך ורק על נתונים שנשמרים בפועל ב-Workout/WorkoutExercise/WorkoutSet:
//   - פעילות אימונים (שבוע עם ניווט אחורה / חודש עם לוח שנה אמיתי) + ממוצע שבועי מול 4 השבועות הקודמים
//   - סטים / חזרות / עוצמה (משקל ממוצע לחזרה) לכל אימון, לפי טווח שבוע/חודש/הכל
//   - מנוחה מול זמן עבודה לכל אימון (מבוסס על restBeforeSeconds שנשמר לכל סט), עם "הצג עוד"
//
// הערה חשובה: הקובץ הזה מניח ש-`useAuth()` מחזיר אובייקט עם שדה `user` שיש לו `uid`
// (התבנית הרגילה של Firebase Auth). אם החתימה אצלך שונה - תעדכן את השורה המסומנת למטה.

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../lib/authContext'; // ⚠️ עדכני אם הנתיב/החתימה אצלך שונים
import { getUserWorkouts } from '../lib/workoutService';
import { Workout } from '../types/workout';

// ---------- עיצוב ----------
// פלטת הצבעים המקורית מהמוקאפ המאושר
const ACCENT = '#5b8cff';
const BG = '#0f0f10';
const CARD_BG = '#1c1c1e';
const CARD_BG_2 = '#141415';
const BORDER = '#2c2c2e';
const TEXT = '#ffffff';
const MUTED = '#9a9a9e';
const FAINT = '#6a6a6e';
const WARN = '#ff9f0a';
const GREEN = '#34c759';

const HE_MONTHS_FULL = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const HE_MONTHS_SHORT = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
const HE_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // א=ראשון ... ש=שבת

// ---------- עזרי תאריכים ----------
function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}
function fmtWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ב${HE_MONTHS_SHORT[weekStart.getMonth()]}׳`;
  }
  return `${weekStart.getDate()} ב${HE_MONTHS_SHORT[weekStart.getMonth()]}׳ – ${weekEnd.getDate()} ב${HE_MONTHS_SHORT[weekEnd.getMonth()]}׳`;
}

// ---------- עזרי חישוב על אימון בודד ----------
function workoutDurationStats(w: Workout) {
  const durationMin = w.finishedAt ? Math.max(Math.round((w.finishedAt - w.startedAt) / 60000), 1) : 0;
  let restSeconds = 0;
  w.exercises.forEach((ex) => ex.sets.forEach((s) => { if (s.restBeforeSeconds) restSeconds += s.restBeforeSeconds; }));
  const restMin = Math.round(restSeconds / 60);
  const workMin = Math.max(durationMin - restMin, 0);
  return { durationMin, restMin, workMin };
}
function workoutMetrics(w: Workout) {
  let sets = 0, reps = 0, volume = 0;
  w.exercises.forEach((ex) => ex.sets.forEach((s) => { sets += 1; reps += s.reps; volume += s.reps * s.weight; }));
  return { sets, reps, volume };
}

// ---------- טיפוסים פנימיים ----------
type MetricKey = 'sets' | 'reps' | 'intensity';
type RangeKey = 'week' | 'month' | 'all';
interface MetricPoint { date: string; sets: number; reps: number; volume: number; }
interface RestWorkPoint { date: string; durationMin: number; workMin: number; restMin: number; }

export default function AnalysisScreen() {
  const { user } = useAuth();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activityView, setActivityView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0); // 0..-4
  const [monthOffset, setMonthOffset] = useState(0); // 0..-2
  const [range, setRange] = useState<RangeKey>('week');
  const [metric, setMetric] = useState<MetricKey>('sets');
  const [restWorkExpanded, setRestWorkExpanded] = useState(false);

  // המסך נשאר "חי" בזיכרון כשעוברים לטאב אחר, אז טעינה רק ב-mount לא הייתה
  // מציגה אימון חדש שנוסף אחרי הביקור הראשון כאן. לכן טוענים מחדש בכל פעם
  // שהטאב "ניתוח" חוזר לפוקוס (בדיוק כמו ב-HistoryScreen).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!user) return;
      setLoading(true);
      setError(null);
      getUserWorkouts(user.uid, 300)
        .then((data) => {
          if (!cancelled) setWorkouts(data.filter((w) => w.status === 'completed'));
        })
        .catch(() => {
          if (!cancelled) setError('לא הצלחנו לטעון את נתוני האימונים. נסי שוב מאוחר יותר.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }, [user?.uid])
  );

  const now = useMemo(() => new Date(), []);

  // --- קיבוץ שבועי (משמש גם לניווט השבועי, גם לממוצע, גם לטווח "הכל") ---
  const weeklyBuckets = useMemo(() => {
    const start0 = startOfWeek(now);
    const buckets: { weekStart: Date; workouts: Workout[] }[] = [];
    for (let i = 0; i < 8; i++) {
      const weekStart = addDays(start0, -7 * i);
      const weekEnd = addDays(weekStart, 7);
      const inWeek = workouts.filter((w) => w.startedAt >= weekStart.getTime() && w.startedAt < weekEnd.getTime());
      buckets.push({ weekStart, workouts: inWeek });
    }
    return buckets; // index 0 = השבוע הנוכחי, index 7 = לפני 7 שבועות
  }, [workouts, now]);

  const weeksNav = useMemo(() => weeklyBuckets.slice(0, 5).map((b) => ({
    label: fmtWeekLabel(b.weekStart),
    count: b.workouts.length,
    days: HE_WEEKDAYS.map((_, i) => b.workouts.some((w) => isSameDay(new Date(w.startedAt), addDays(b.weekStart, i)))),
  })), [weeklyBuckets]);

  const selectedWeek = weeksNav[-weekOffset] ?? weeksNav[0];

  // --- לוח שנה חודשי אמיתי ---
  const monthsNav = useMemo(() => {
    return [0, 1, 2].map((back) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const year = ref.getFullYear();
      const monthIdx = ref.getMonth();
      const isCurrent = back === 0;
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const cappedDays = isCurrent ? now.getDate() : daysInMonth;
      const firstWeekday = new Date(year, monthIdx, 1).getDay();
      const inMonth = workouts.filter((w) => {
        const d = new Date(w.startedAt);
        return d.getFullYear() === year && d.getMonth() === monthIdx;
      });
      const activeDates = new Set(inMonth.map((w) => new Date(w.startedAt).getDate()));
      return {
        label: HE_MONTHS_FULL[monthIdx] + ' ' + year + (isCurrent ? ' (עד כה)' : ''),
        count: inMonth.length,
        firstWeekday,
        daysInMonth: cappedDays,
        activeDates,
      };
    });
  }, [workouts, now]);

  const selectedMonth = monthsNav[-monthOffset] ?? monthsNav[0];

  const calendarWeeks = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < selectedMonth.firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= selectedMonth.daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [selectedMonth]);

  const atOldest = activityView === 'week' ? weekOffset <= -4 : monthOffset <= -2;
  const atNewest = activityView === 'week' ? weekOffset >= 0 : monthOffset >= 0;
  const goPrev = () => (activityView === 'week' ? setWeekOffset((o) => Math.max(o - 1, -4)) : setMonthOffset((o) => Math.max(o - 1, -2)));
  const goNext = () => (activityView === 'week' ? setWeekOffset((o) => Math.min(o + 1, 0)) : setMonthOffset((o) => Math.min(o + 1, 0)));

  // --- ממוצע אימונים לשבוע: 4 שבועות אחרונים מול 4 שלפניהם ---
  const { avgPerWeek, trendPct, trendUp } = useMemo(() => {
    const counts = weeklyBuckets.map((b) => b.workouts.length);
    const recentAvg = counts.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
    const previousAvg = counts.slice(4, 8).reduce((a, b) => a + b, 0) / 4;
    const pct = previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : (recentAvg > 0 ? 100 : 0);
    return { avgPerWeek: recentAvg.toFixed(1), trendPct: pct, trendUp: pct >= 0 };
  }, [weeklyBuckets]);

  // --- נתוני טווח (שבוע/חודש/הכל) לגרף המדדים ולרשימת מנוחה-מול-עבודה ---
  const rangeWorkouts = useMemo(() => {
    if (range === 'week') return weeklyBuckets[0].workouts.slice().sort((a, b) => a.startedAt - b.startedAt);
    if (range === 'month') {
      const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return workouts.filter((w) => w.startedAt >= cutoff).sort((a, b) => a.startedAt - b.startedAt);
    }
    return []; // 'all' משתמש בקיבוץ השבועי, ראה למטה
  }, [range, weeklyBuckets, workouts, now]);

  const metricPoints: MetricPoint[] = useMemo(() => {
    if (range === 'all') {
      return weeklyBuckets.slice().reverse().map((b, i) => {
        const totals = b.workouts.reduce((acc, w) => {
          const m = workoutMetrics(w);
          acc.sets += m.sets; acc.reps += m.reps; acc.volume += m.volume;
          return acc;
        }, { sets: 0, reps: 0, volume: 0 });
        return { date: `שבוע ${i + 1}`, ...totals };
      });
    }
    return rangeWorkouts.map((w) => ({ date: fmtDateShort(w.startedAt), ...workoutMetrics(w) }));
  }, [range, rangeWorkouts, weeklyBuckets]);

  const restWorkSource: RestWorkPoint[] = useMemo(() => {
    if (range === 'all') {
      return workouts
        .slice()
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 10)
        .reverse()
        .map((w) => ({ date: fmtDateShort(w.startedAt), ...workoutDurationStats(w) }));
    }
    return rangeWorkouts.map((w) => ({ date: fmtDateShort(w.startedAt), ...workoutDurationStats(w) }));
  }, [range, rangeWorkouts, workouts]);

  const restWorkVisible = restWorkExpanded ? restWorkSource : restWorkSource.slice(0, 3);
  const hasShowMore = restWorkSource.length > 3;

  const rangeLabel = range === 'week' ? 'השבוע' : range === 'month' ? 'ב-30 הימים האחרונים' : 'שבועי, 8 השבועות האחרונים';
  const metricTitle = metric === 'sets' ? 'מספר סטים לכל אימון' : metric === 'reps' ? 'סה"כ חזרות לכל אימון' : 'משקל ממוצע לחזרה';
  const metricSubtitle = (metric === 'sets' ? 'כמות עבודה גולמית' : metric === 'reps' ? 'מדד עומס עבודה מחוץ למשקל' : 'מדד עוצמה, לפי אימון') + ' · ' + rangeLabel;

  const getMetricValue = (p: MetricPoint) => {
    if (metric === 'sets') return p.sets;
    if (metric === 'reps') return p.reps;
    return p.reps > 0 ? Math.round((p.volume / p.reps) * 10) / 10 : 0;
  };
  const metricUnit = metric === 'intensity' ? ' ק"ג' : '';
  const maxMetricVal = Math.max(1, ...metricPoints.map(getMetricValue)) * 1.15;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (workouts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>אין עדיין נתונים לניתוח</Text>
        <Text style={styles.emptySubtitle}>סיימי כמה אימונים ותוכלי לראות כאן את ההתקדמות שלך</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 56, paddingBottom: 32 }}>
      <Text style={styles.pageTitle}>ניתוח והתקדמות</Text>

      {/* ===== 1. פעילות אימונים ===== */}
      <View style={[styles.card, { marginTop: 22 }]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>פעילות אימונים</Text>
          <View style={styles.segmentSmall}>
            <TouchableOpacity
              style={[styles.segmentSmallBtn, activityView === 'week' && styles.segmentSmallBtnActive]}
              onPress={() => setActivityView('week')}
            >
              <Text style={[styles.segmentSmallText, activityView === 'week' && styles.segmentSmallTextActive]}>שבוע</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentSmallBtn, activityView === 'month' && styles.segmentSmallBtnActive]}
              onPress={() => setActivityView('month')}
            >
              <Text style={[styles.segmentSmallText, activityView === 'month' && styles.segmentSmallTextActive]}>חודש</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.rowBetween, { marginTop: 16, marginBottom: 16 }]}>
          <TouchableOpacity onPress={goPrev} disabled={atOldest} style={[styles.navCircle, atOldest && styles.navCircleDisabled]}>
            <Text style={styles.navCircleText}>›</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.periodLabel}>{activityView === 'week' ? selectedWeek.label : selectedMonth.label}</Text>
            <Text style={styles.periodCount}>
              {(activityView === 'week' ? selectedWeek.count : selectedMonth.count)}{' '}
              {(activityView === 'week' ? selectedWeek.count : selectedMonth.count) === 1 ? 'אימון' : 'אימונים'}
            </Text>
          </View>
          <TouchableOpacity onPress={goNext} disabled={atNewest} style={[styles.navCircle, atNewest && styles.navCircleDisabled]}>
            <Text style={styles.navCircleText}>‹</Text>
          </TouchableOpacity>
        </View>

        {activityView === 'week' ? (
          <View style={styles.weekRow}>
            {HE_WEEKDAYS.map((label, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <View style={[styles.dayDot, selectedWeek.days[i] && styles.dayDotActive]} />
                <Text style={styles.dayLetter}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View>
            <View style={styles.weekRow}>
              {HE_WEEKDAYS.map((label, i) => (
                <Text key={i} style={styles.calHeaderText}>{label}</Text>
              ))}
            </View>
            {calendarWeeks.map((week, wi) => (
              <View key={wi} style={[styles.weekRow, { marginBottom: 4 }]}>
                {week.map((day, di) => {
                  const active = day != null && selectedMonth.activeDates.has(day);
                  return (
                    <View
                      key={di}
                      style={[styles.calCell, day != null && (active ? styles.calCellActive : styles.calCellInactive)]}
                    >
                      {day != null && <Text style={[styles.calCellText, active && styles.calCellTextActive]}>{day}</Text>}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={styles.avgBlock}>
          <View style={styles.avgBox}>
            <Text style={styles.avgBoxLabel}>ממוצע אימונים לשבוע (4 שבועות אחרונים)</Text>
            <Text style={styles.avgBoxValue}>{avgPerWeek}</Text>
          </View>
          <View style={[styles.trendBadge, { backgroundColor: trendUp ? 'rgba(52,199,89,0.15)' : 'rgba(255,159,10,0.15)' }]}>
            <Text style={[styles.trendBadgeText, { color: trendUp ? GREEN : WARN }]}>
              {(trendUp ? '▲ +' : '▼ ') + trendPct + '% לעומת 4 השבועות הקודמים'}
            </Text>
          </View>
        </View>
      </View>

      {/* ===== טאב טווח (שבוע/חודש/הכל) ===== */}
      <View style={styles.segmentWide}>
        {(['week', 'month', 'all'] as RangeKey[]).map((r) => (
          <TouchableOpacity key={r} style={[styles.segmentWideBtn, range === r && styles.segmentWideBtnActive]} onPress={() => { setRange(r); setRestWorkExpanded(false); }}>
            <Text style={[styles.segmentWideText, range === r && styles.segmentWideTextActive]}>
              {r === 'week' ? 'שבוע' : r === 'month' ? 'חודש' : 'הכל'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== 2. סטים / חזרות / עוצמה ===== */}
      <View style={styles.card}>
        <View style={styles.segmentTiny}>
          {(['sets', 'reps', 'intensity'] as MetricKey[]).map((m) => (
            <TouchableOpacity key={m} style={[styles.segmentTinyBtn, metric === m && styles.segmentWideBtnActive]} onPress={() => setMetric(m)}>
              <Text style={[styles.segmentWideText, metric === m && styles.segmentWideTextActive]}>
                {m === 'sets' ? 'סטים' : m === 'reps' ? 'חזרות' : 'עוצמה'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.cardTitle}>{metricTitle}</Text>
        <Text style={styles.cardSubtitle}>{metricSubtitle}</Text>

        <View style={styles.barsRow}>
          {metricPoints.map((p, i) => {
            const val = getMetricValue(p);
            const h = Math.max(Math.round((val / maxMetricVal) * 110), 4);
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <View style={styles.barColumn}>
                  <View style={[styles.bar, { height: h }, metric === 'intensity' && { overflow: 'hidden' }]}>
                    {metric === 'intensity' ? (
                      <Text style={styles.barLabelInside}>{val + metricUnit}</Text>
                    ) : (
                      <Text style={styles.barLabelAbove}>{val + metricUnit}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.barDate}>{p.date}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ===== 3. מנוחה מול זמן עבודה ===== */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>מנוחה מול זמן עבודה, לכל אימון</Text>
        <Text style={styles.cardSubtitle}>משך כל אימון, מחולק לזמן עבודה בפועל מול זמן מנוחה</Text>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
            <Text style={styles.legendText}>עבודה</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: WARN }]} />
            <Text style={styles.legendText}>מנוחה</Text>
          </View>
        </View>

        {restWorkVisible.map((item, i) => {
          const workPct = item.durationMin > 0 ? Math.round((item.workMin / item.durationMin) * 100) : 0;
          const restPct = 100 - workPct;
          return (
            <View key={i} style={styles.restWorkRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.restWorkDate}>{item.date}</Text>
                <Text style={styles.restWorkDuration}>סה"כ {item.durationMin} דק׳</Text>
              </View>
              <View style={styles.stackedBar}>
                <View style={{ flex: workPct || 0.0001, backgroundColor: ACCENT }} />
                <View style={{ flex: restPct || 0.0001, backgroundColor: WARN }} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.restWorkSubLabel}>עבודה: {item.workMin} דק׳</Text>
                <Text style={styles.restWorkSubLabel}>מנוחה: {item.restMin} דק׳</Text>
              </View>
            </View>
          );
        })}

        {hasShowMore && (
          <TouchableOpacity style={styles.showMoreButton} onPress={() => setRestWorkExpanded((v) => !v)}>
            <Text style={styles.showMoreText}>
              {restWorkExpanded ? 'הצג פחות' : `הצג עוד (${restWorkSource.length - 3})`}
            </Text>
          </TouchableOpacity>
        )}

        {range === 'all' && (
          <Text style={styles.moreNote}>מוצגים עד 10 האימונים האחרונים מתוך {workouts.length} סה"כ</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centerContainer: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: WARN, fontSize: 15, textAlign: 'center', writingDirection: 'rtl' },
  emptyTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center', writingDirection: 'rtl' },
  emptySubtitle: { color: MUTED, fontSize: 14, textAlign: 'center', writingDirection: 'rtl' },

  // עם forceRTL פעיל, textAlign 'right'/'left' על טקסט שממלא את כל הרוחב מתהפך
  // ויזואלית (זו התנהגות ידועה של RN/Android תחת RTL כפוי) - לכן 'left' כאן
  // מציג בפועל טקסט מיושר לימין.
  pageTitle: { color: TEXT, fontSize: 22, fontWeight: '800', textAlign: 'left', writingDirection: 'rtl' },

  card: { backgroundColor: CARD_BG, borderRadius: 16, padding: 18, marginTop: 22 },
  cardTitle: { color: TEXT, fontSize: 14, fontWeight: '700', textAlign: 'left', writingDirection: 'rtl' },
  cardSubtitle: { color: MUTED, fontSize: 11.5, marginTop: 2, marginBottom: 16, textAlign: 'left', writingDirection: 'rtl' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  segmentSmall: { flexDirection: 'row', backgroundColor: CARD_BG_2, borderRadius: 9, padding: 3, gap: 3 },
  segmentSmallBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7 },
  segmentSmallBtnActive: { backgroundColor: ACCENT },
  segmentSmallText: { color: MUTED, fontSize: 12, fontWeight: '700' },
  segmentSmallTextActive: { color: '#0f0f10' },

  navCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  navCircleDisabled: { opacity: 0.35 },
  navCircleText: { color: TEXT, fontSize: 16 },
  periodLabel: { color: TEXT, fontSize: 13, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  periodCount: { color: FAINT, fontSize: 11, marginTop: 1, textAlign: 'center', writingDirection: 'rtl' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: BORDER, backgroundColor: 'transparent' },
  dayDotActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayLetter: { color: FAINT, fontSize: 10, textAlign: 'center', writingDirection: 'rtl' },

  calHeaderText: { width: 38, textAlign: 'center', writingDirection: 'rtl', color: FAINT, fontSize: 9.5, marginBottom: 6 },
  calCell: { width: 38, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  calCellInactive: { borderWidth: 1, borderColor: BORDER },
  calCellActive: { borderWidth: 2, borderColor: ACCENT },
  calCellText: { color: MUTED, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  calCellTextActive: { color: TEXT, fontWeight: '800' },

  avgBlock: { alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER },
  avgBox: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, backgroundColor: 'rgba(91,140,255,0.12)' },
  avgBoxLabel: { color: MUTED, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  avgBoxValue: { color: TEXT, fontSize: 17, fontWeight: '800', marginTop: 2, textAlign: 'center', writingDirection: 'rtl' },
  trendBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  trendBadgeText: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },

  segmentWide: { flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 12, padding: 4, gap: 4, marginTop: 22 },
  segmentWideBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentWideBtnActive: { backgroundColor: ACCENT },
  segmentWideText: { color: MUTED, fontSize: 13, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  segmentWideTextActive: { color: '#0f0f10' },

  segmentTiny: { flexDirection: 'row', gap: 4, marginBottom: 14 },
  segmentTinyBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9 },

  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barColumn: { height: 110, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 5, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  barLabelAbove: { position: 'absolute', top: -15, color: '#c7c7cc', fontSize: 8.5, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  barLabelInside: { color: '#fff', fontSize: 8, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl', transform: [{ rotate: '-90deg' }] },
  barDate: { color: FAINT, fontSize: 8, marginTop: 6, textAlign: 'center', writingDirection: 'rtl' },

  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  legendText: { color: MUTED, fontSize: 10.5, textAlign: 'right', writingDirection: 'rtl' },

  restWorkRow: { gap: 6, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  restWorkDate: { color: TEXT, fontSize: 12.5, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  restWorkDuration: { color: MUTED, fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl' },
  stackedBar: { flexDirection: 'row', width: '100%', height: 10, borderRadius: 5, overflow: 'hidden' },
  restWorkSubLabel: { color: FAINT, fontSize: 10.5, textAlign: 'right', writingDirection: 'rtl' },

  showMoreButton: { marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  showMoreText: { color: '#c7c7cc', fontSize: 12.5, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  moreNote: { color: FAINT, fontSize: 11, marginTop: 10, textAlign: 'left', writingDirection: 'rtl' },
});
