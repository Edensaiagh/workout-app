import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ExerciseVolume {
  name: string;
  volumeKg: number;
}

export interface ShareCardData {
  durationMinutes: number;
  date: Date;
  totalVolumeKg: number;
  exerciseCount: number;
  workoutsThisWeek: number;
  newPRsCount: number; // כרגע תמיד 0 - זיהוי השיאים ייבנה בהמשך (ראו קובץ המעקב)
  // כבר ממוין מהכבד לקל, ומוגבל ל-8 לפני שמגיע לכאן (ראו lib/shareStats.ts)
  topExercises: ExerciseVolume[];
}

interface ShareCardProps {
  data: ShareCardData;
  expanded: boolean;
  onToggleExpand: () => void;
  appName?: string;
}

const AMBER = '#ffb454'; // צבע ה-accent האמיתי של האפליקציה (ראה App.tsx)
const AMBER_LOW = '#4a3510';

const WEEKDAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_NAMES = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
];

export function formatShareCardDate(date: Date): string {
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  return `יום ${weekday}, ${day} ${month}`;
}

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function lerpColor(hex1: string, hex2: string, t: number) {
  const c1 = [parseInt(hex1.slice(1, 3), 16), parseInt(hex1.slice(3, 5), 16), parseInt(hex1.slice(5, 7), 16)];
  const c2 = [parseInt(hex2.slice(1, 3), 16), parseInt(hex2.slice(3, 5), 16), parseInt(hex2.slice(5, 7), 16)];
  const r = lerpChannel(c1[0], c2[0], t);
  const g = lerpChannel(c1[1], c2[1], t);
  const bl = lerpChannel(c1[2], c2[2], t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function ShareCard({ data, expanded, onToggleExpand, appName = 'שם האפליקציה' }: ShareCardProps) {
  const visibleCount = expanded ? data.topExercises.length : Math.min(3, data.topExercises.length);
  const dense = visibleCount > 3;
  const rowFontSize = dense ? 9 : 10;
  const barHeight = dense ? 4 : 6;
  const rowGap = dense ? 4 : 6;

  const maxVol = data.topExercises[0]?.volumeKg ?? 0;
  const minVol = data.topExercises[data.topExercises.length - 1]?.volumeKg ?? 0;

  const remainingBeyondVisible = data.topExercises.length - visibleCount;
  const hiddenBeyondCap = Math.max(0, data.exerciseCount - data.topExercises.length);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.logoBadge}>
          <Ionicons name="flash" size={15} color="#241704" />
        </View>
        <Text style={styles.appName}>{appName}</Text>
      </View>

      <View style={styles.subtitleRow}>
        <Text style={styles.subtitleText}>{data.durationMinutes} דקות</Text>
        <Ionicons name="sparkles" size={14} color={AMBER} style={{ marginRight: 6 }} />
      </View>

      <Text style={styles.titleDate}>{formatShareCardDate(data.date)}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.exerciseCount}</Text>
          <Text style={styles.statLabel}>תרגילים</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.totalVolumeKg.toLocaleString('he-IL')}</Text>
          <Text style={styles.statLabel}>ק"ג נפח</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.workoutsThisWeek}</Text>
          <Text style={styles.statLabel}>אימונים השבוע</Text>
        </View>
      </View>

      <View style={styles.exerciseSection}>
        <Text style={styles.exerciseSectionLabel}>נפח לפי תרגיל - 8 הכבדים ביותר</Text>
        <View style={{ gap: rowGap }}>
          {data.topExercises.slice(0, visibleCount).map((ex, idx) => {
            const pct = maxVol > 0 ? (ex.volumeKg / maxVol) * 100 : 0;
            const t = maxVol === minVol ? 1 : (ex.volumeKg - minVol) / (maxVol - minVol);
            const barColor = lerpColor(AMBER_LOW, AMBER, 0.35 + t * 0.65);
            const textColor = idx === 0 ? AMBER : '#8a8a8a';
            return (
              <View key={`${ex.name}-${idx}`}>
                <View style={styles.exerciseLabelRow}>
                  <Text style={[styles.exerciseName, { fontSize: rowFontSize }]}>{ex.name}</Text>
                  <Text style={[styles.exerciseVolume, { fontSize: rowFontSize, color: textColor }]}>
                    {ex.volumeKg.toLocaleString('he-IL')} ק"ג
                  </Text>
                </View>
                <View style={[styles.barTrack, { height: barHeight }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor, height: barHeight }]} />
                </View>
              </View>
            );
          })}
        </View>

        {(remainingBeyondVisible > 0 || hiddenBeyondCap > 0 || expanded) && data.topExercises.length > 3 && (
          <Text onPress={onToggleExpand} style={styles.moreButton}>
            {expanded
              ? hiddenBeyondCap > 0
                ? `הצג פחות (+${hiddenBeyondCap} נוספים לא מוצגים)`
                : 'הצג פחות'
              : `הצג עוד ${remainingBeyondVisible} תרגילים`}
          </Text>
        )}
      </View>

      {data.newPRsCount > 0 && (
        <View style={styles.prBadge}>
          <Ionicons name="trophy" size={13} color={AMBER} />
          <Text style={styles.prBadgeText}>{data.newPRsCount} שיאים אישיים חדשים</Text>
        </View>
      )}

      <Text style={styles.footer}>נוצר ב{appName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 270,
    aspectRatio: 9 / 16,
    borderRadius: 22,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 22,
    justifyContent: 'space-between',
  },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  logoBadge: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: 13, fontWeight: '500', color: '#eeeeee', textAlign: 'right' },
  subtitleRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 12 },
  subtitleText: { fontSize: 12, color: '#8a8a8a', textAlign: 'right' },
  titleDate: { fontSize: 22, fontWeight: '500', color: '#ffffff', textAlign: 'right', marginTop: 6, marginBottom: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '500', color: AMBER },
  statLabel: { fontSize: 10, color: '#8a8a8a', marginTop: 2 },
  exerciseSection: { marginBottom: 14 },
  exerciseSectionLabel: { fontSize: 11, color: '#8a8a8a', marginBottom: 8, textAlign: 'right' },
  exerciseLabelRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 2 },
  exerciseName: { color: '#cfcfcf', textAlign: 'right' },
  exerciseVolume: { textAlign: 'left' },
  barTrack: { backgroundColor: '#2a2a2a', borderRadius: 3, overflow: 'hidden' },
  barFill: { borderRadius: 3, alignSelf: 'flex-end' },
  moreButton: { color: AMBER, fontSize: 11, marginTop: 4, textAlign: 'right' },
  prBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: '#2a2008', borderWidth: 1, borderColor: '#4a3a12', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  prBadgeText: { fontSize: 12, color: AMBER },
  footer: { fontSize: 10, color: '#5a5a5a', textAlign: 'center' },
});
