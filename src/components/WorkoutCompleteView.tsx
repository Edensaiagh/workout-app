import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Workout } from '../types/workout';
import { ShareCardData } from './ShareCard';
import { ShareWorkoutButton } from './ShareWorkoutButton';
import { buildShareCardDataFromWorkout, getWorkoutsThisWeekCount } from '../lib/shareStats';

interface WorkoutCompleteViewProps {
  workout: Workout;
  savedTo: 'cloud' | 'local';
  userId: string;
  onStartNew: () => void;
  appName?: string;
}

const AMBER = '#ffb454';

export function WorkoutCompleteView({ workout, savedTo, userId, onStartNew, appName }: WorkoutCompleteViewProps) {
  const [shareData, setShareData] = useState<ShareCardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWorkoutsThisWeekCount(userId)
      .then((count) => {
        if (cancelled) return;
        setShareData(buildShareCardDataFromWorkout(workout, count));
      })
      .catch(() => {
        // אם ספירת "אימונים השבוע" נכשלת, לא חוסמים את כל המסך - מציגים 0
        if (cancelled) return;
        setShareData(buildShareCardDataFromWorkout(workout, 0));
      });
    return () => {
      cancelled = true;
    };
  }, [workout.id, userId]);

  const durationMinutes =
    workout.finishedAt != null ? Math.max(0, Math.round((workout.finishedAt - workout.startedAt) / 60000)) : 0;
  const totalVolume = workout.totalVolume ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="sparkles" size={26} color={AMBER} />
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
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>שיאים חדשים</Text>
        </View>
      </View>

      {savedTo === 'cloud' && (
        <View style={styles.cloudBanner}>
          <Ionicons name="cloud-done-outline" size={16} color="#7bc47b" />
          <Text style={styles.cloudBannerText}>האימון נשמר בענן</Text>
        </View>
      )}
      {/* אם savedTo === 'local', ה-Alert הקיים כבר הוצג ב-doFinish - אין כאן באנר נוסף */}

      {shareData ? (
        <ShareWorkoutButton data={shareData} appName={appName} />
      ) : (
        <View style={[styles.shareButtonPlaceholder]}>
          <ActivityIndicator color="#241704" />
        </View>
      )}

      <TouchableOpacity style={styles.newWorkoutButton} onPress={onStartNew}>
        <Text style={styles.newWorkoutButtonText}>התחל אימון חדש</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f10', paddingHorizontal: 20, paddingTop: 64 },
  badge: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#2a2008',
    borderWidth: 1, borderColor: '#4a3a12', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: '500', color: '#f1f0ec', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 2, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#17181c', borderRadius: 14, borderWidth: 1, borderColor: '#2c2c2e',
    paddingVertical: 14, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '500', color: AMBER },
  statLabel: { fontSize: 11, color: '#8a8a8a', marginTop: 2 },
  cloudBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#17181c',
    borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 20,
  },
  cloudBannerText: { fontSize: 13, color: '#cfcfcf' },
  shareButtonPlaceholder: {
    width: '100%', backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, opacity: 0.7,
  },
  newWorkoutButton: {
    width: '100%', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2c2c2e',
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  newWorkoutButtonText: { color: '#cfcfcf', fontSize: 14 },
});
