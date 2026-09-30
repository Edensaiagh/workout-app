import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Workout } from '../types/workout';
import { ShareCardData } from './ShareCard';
import { ShareWorkoutButton } from './ShareWorkoutButton';
import { buildShareCardDataFromWorkout, getWorkoutsThisWeekCount } from '../lib/shareStats';
import { colors, common, fontSize, radius, spacing } from '../theme';

interface WorkoutCompleteViewProps {
  workout: Workout;
  savedTo: 'cloud' | 'local';
  userId: string;
  newPRsCount: number; // מגיע מ-saveWorkout (ראו workoutService.ts) - כבר מחושב, לא נטען כאן מחדש
  onStartNew: () => void;
  appName?: string;
}

export function WorkoutCompleteView({
  workout,
  savedTo,
  userId,
  newPRsCount,
  onStartNew,
  appName,
}: WorkoutCompleteViewProps) {
  const [shareData, setShareData] = useState<ShareCardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWorkoutsThisWeekCount(userId)
      .then((count) => {
        if (cancelled) return;
        setShareData(buildShareCardDataFromWorkout(workout, count, newPRsCount));
      })
      .catch(() => {
        // אם ספירת "אימונים השבוע" נכשלת, לא חוסמים את כל המסך - מציגים 0
        if (cancelled) return;
        setShareData(buildShareCardDataFromWorkout(workout, 0, newPRsCount));
      });
    return () => {
      cancelled = true;
    };
  }, [workout.id, userId, newPRsCount]);

  const durationMinutes =
    workout.finishedAt != null ? Math.max(0, Math.round((workout.finishedAt - workout.startedAt) / 60000)) : 0;
  const totalVolume = workout.totalVolume ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="sparkles" size={26} color={colors.accent} />
      </View>
      <Text style={styles.title}>אימון הושלם!</Text>
      <Text style={styles.subtitle}>{durationMinutes} דקות</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{workout.exercises.length}</Text>
          <Text style={styles.statLabel}>תרגילים</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalVolume.toLocaleString('he-IL')}</Text>
          <Text style={styles.statLabel}>ק"ג נפח</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{newPRsCount}</Text>
          <Text style={styles.statLabel}>שיאים חדשים</Text>
        </View>
      </View>

      {savedTo === 'cloud' && (
        <View style={styles.cloudBanner}>
          <Ionicons name="cloud-done-outline" size={16} color={colors.success} />
          <Text style={styles.cloudBannerText}>האימון נשמר בענן</Text>
        </View>
      )}
      {/* אם savedTo === 'local', ה-Alert הקיים כבר הוצג ב-doFinish - אין כאן באנר נוסף.
          שימו לב: כשנשמר רק מקומית, newPRsCount תמיד 0 (ראו workoutService.ts) - השיאים
          יתעדכנו בפעם הבאה שהאימון הזה יסתנכרן לענן, לא עכשיו. */}

      {shareData ? (
        <ShareWorkoutButton data={shareData} appName={appName} />
      ) : (
        <View style={[common.primaryButton, styles.shareButtonPlaceholder]}>
          <ActivityIndicator color={colors.onAccent} />
        </View>
      )}

      <TouchableOpacity style={[common.secondaryButton, styles.fullWidth]} onPress={onStartNew}>
        <Text style={common.secondaryButtonText}>התחל אימון חדש</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 64 },
  badge: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentBadgeBg,
    borderWidth: 1, borderColor: colors.accentBadgeBorder, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 10,
  },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.textDim, textAlign: 'center', marginTop: 2, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    paddingVertical: 14, alignItems: 'center',
  },
  statValue: { fontSize: fontSize.xl - 2, fontWeight: '600', color: colors.accent },
  statLabel: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  cloudBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: spacing.lg,
    marginBottom: 20,
  },
  cloudBannerText: { fontSize: fontSize.sm, color: colors.text },
  fullWidth: { width: '100%' },
  shareButtonPlaceholder: { width: '100%', marginBottom: 10, opacity: 0.7 },
});
