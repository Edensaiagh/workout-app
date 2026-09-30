import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Workout } from '../types/workout';
import { ShareCardData } from './ShareCard';
import { ShareWorkoutButton } from './ShareWorkoutButton';
import { buildShareCardDataFromWorkout, getWorkoutsThisWeekCount } from '../lib/shareStats';
import type { BrokenRecord } from '../lib/personalRecords';
import { haptics } from '../lib/haptics';
import { fontSize, radius, spacing, Text, useTheme } from '../theme';
import type { Palette } from '../theme';

interface WorkoutCompleteViewProps {
  workout: Workout;
  savedTo: 'cloud' | 'local';
  userId: string;
  newPRsCount: number; // מגיע מ-saveWorkout (ראו workoutService.ts) - כבר מחושב, לא נטען כאן מחדש
  newRecords: BrokenRecord[]; // פירוט השיאים שנשברו, להצגה ברשימה
  onStartNew: () => void;
  appName?: string;
}

const KIND_LABEL: Record<BrokenRecord['kind'], string> = {
  weight: 'שיא משקל',
  reps: 'שיא חזרות',
  volume: 'שיא נפח באימון',
};

function formatRecordValue(r: BrokenRecord): string {
  const n = r.value.toLocaleString('he-IL');
  return r.kind === 'reps' ? `${n} חזרות` : `${n} ק״ג`;
}

function formatWorkoutDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

// ---- קונפטי: 26 חלקים, נופלים פעם אחת ----
const CONFETTI_COUNT = 26;
const CONFETTI_FALL = 470;
const CONFETTI_DRIFT = [-46, 38, -16, 64];

interface ConfettiPiece {
  left: `${number}%`;
  width: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
}

function buildConfetti(colors: Palette): ConfettiPiece[] {
  const palette = [colors.accentText, colors.teal, colors.info, colors.text, colors.accentText, colors.danger];
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    left: `${6 + ((i * 37) % 88)}%` as const,
    width: 6 + (i % 3) * 2,
    height: 10 + (i % 4) * 2,
    color: palette[i % palette.length],
    delay: (i % 7) * 90,
    duration: 2200 + (i % 5) * 250,
    drift: CONFETTI_DRIFT[i % 4],
    spin: (i % 2 === 0 ? 1 : -1) * (280 + (i % 4) * 70),
  }));
}

function ConfettiPieceView({ piece }: { piece: ConfettiPiece }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: piece.duration,
      delay: piece.delay,
      easing: Easing.bezier(0.3, 0.1, 0.6, 1),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: piece.left,
        width: piece.width,
        height: piece.height,
        borderRadius: 2,
        backgroundColor: piece.color,
        opacity: t.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-20, CONFETTI_FALL] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, piece.drift] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] }) },
        ],
      }}
    />
  );
}

// ---- טבעת שמתפשטת מהתג ----
function PulseRing({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      { iterations: 2 }
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
        },
      ]}
    />
  );
}

// ---- אלמנט שעולה ומופיע (כותרת, רשימת שיאים) ----
function Rise({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: object }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ---- מספר שסופר מעלה מ-0 ליעד ----
function useCountUp(target: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    const t = new Animated.Value(0);
    const id = t.addListener(({ value: v }) => setValue(Math.round(target * v)));
    Animated.timing(t, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => t.removeListener(id);
  }, [target, enabled]);

  return value;
}

export function WorkoutCompleteView({
  workout,
  savedTo,
  userId,
  newPRsCount,
  newRecords,
  onStartNew,
  appName,
}: WorkoutCompleteViewProps) {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [shareData, setShareData] = useState<ShareCardData | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const hasPR = newRecords.length > 0;
  const animate = !reduceMotion;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hasPR) haptics.success();
  }, []);

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

  // תג עם קפיצה קטנה בכניסה
  const badgeScale = useRef(new Animated.Value(0.4)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) {
      badgeScale.setValue(1);
      badgeOpacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(badgeScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [animate]);

  const confetti = useMemo(() => buildConfetti(colors), [colors]);

  const durationMinutes =
    workout.finishedAt != null ? Math.max(0, Math.round((workout.finishedAt - workout.startedAt) / 60000)) : 0;
  const totalVolume = workout.totalVolume ?? 0;
  const dateText = workout.finishedAt != null ? formatWorkoutDate(workout.finishedAt) : '';

  const exCount = useCountUp(workout.exercises.length, animate);
  const volCount = useCountUp(totalVolume, animate);
  const prCount = useCountUp(newRecords.length, animate);

  const Wrap = animate ? Rise : PlainWrap;

  return (
    <View style={styles.container}>
      {/* זוהר עדין מאחורי התג, רק כשיש שיא */}
      {hasPR && (
        <View style={styles.glow} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="prGlow" cx="50%" cy="30%" rx="50%" ry="45%">
                <Stop offset="0" stopColor={colors.accentText} stopOpacity={0.16} />
                <Stop offset="1" stopColor={colors.accentText} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#prGlow)" />
          </Svg>
        </View>
      )}

      {hasPR && animate && (
        <View style={styles.confettiLayer} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {confetti.map((piece, i) => (
            <ConfettiPieceView key={i} piece={piece} />
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badgeWrap}>
            {hasPR && animate && (
              <>
                <PulseRing delay={0} />
                <PulseRing delay={500} />
              </>
            )}
            <Animated.View style={[styles.badge, { opacity: badgeOpacity, transform: [{ scale: badgeScale }] }]}>
              <Ionicons name="trophy-outline" size={46} color={colors.accentText} />
            </Animated.View>
          </View>

          <Wrap delay={120}>
            <Text style={styles.title}>אימון הושלם!</Text>
          </Wrap>
          <Wrap delay={180}>
            <Text style={styles.subtitle}>
              {durationMinutes} דקות{dateText ? ` · ${dateText}` : ''}
            </Text>
          </Wrap>
          {hasPR && (
            <Wrap delay={260} style={styles.prChipWrap}>
              <View style={styles.prChip}>
                <Text style={styles.prChipText}>
                  {newRecords.length === 1 ? 'שברת שיא אישי אחד' : `שברת ${newRecords.length} שיאים אישיים`}
                </Text>
              </View>
            </Wrap>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{exCount}</Text>
            <Text style={styles.statLabel}>תרגילים</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{volCount.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>ק״ג נפח</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{prCount}</Text>
            <Text style={styles.statLabel}>שיאים חדשים</Text>
          </View>
        </View>

        {hasPR && (
          <Wrap delay={700} style={styles.recordsCardWrap}>
            <View style={styles.recordsCard}>
              <View style={styles.recordsHeader}>
                <Ionicons name="trophy-outline" size={16} color={colors.accentText} />
                <Text style={styles.recordsTitle}>השיאים שנשברו באימון</Text>
              </View>
              {newRecords.map((r, i) => (
                <Wrap key={`${r.exercise}-${r.kind}`} delay={850 + i * 150}>
                  <View style={styles.recordRow}>
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordName}>{r.exercise}</Text>
                      <Text style={styles.recordKind}>{KIND_LABEL[r.kind]}</Text>
                    </View>
                    <View style={styles.recordValues}>
                      <Text style={styles.recordValue}>{formatRecordValue(r)}</Text>
                      {r.delta !== null && (
                        <View style={styles.recordDelta}>
                          <Ionicons name="arrow-up" size={12} color={colors.teal} />
                          <Text style={styles.recordDeltaText}>{r.delta.toLocaleString('he-IL')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Wrap>
              ))}
            </View>
          </Wrap>
        )}

        {savedTo === 'cloud' && (
          <View style={styles.cloudBanner}>
            <Ionicons name="cloud-done-outline" size={16} color={colors.success} />
            <Text style={styles.cloudBannerText}>האימון נשמר בענן</Text>
          </View>
        )}
        {/* אם savedTo === 'local', ה-Alert הקיים כבר הוצג ב-doFinish - אין כאן באנר נוסף.
            שימו לב: כשנשמר רק מקומית, אין שיאים (ראו workoutService.ts) - הם יתעדכנו
            בפעם הבאה שהאימון הזה יסתנכרן לענן, לא עכשיו. */}

        <View style={styles.actions}>
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
      </ScrollView>
    </View>
  );
}

// כשהאנימציות כבויות (הפחתת תנועה) עוטפים בלי אנימציה
function PlainWrap({ children, style }: { delay?: number; children: React.ReactNode; style?: object }) {
  return <View style={style}>{children}</View>;
}

const BADGE_SIZE = 96;

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: 64, paddingBottom: spacing.xxl, gap: spacing.lg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 330 },
  confettiLayer: { position: 'absolute', top: 40, left: 0, right: 0, height: 520, overflow: 'hidden' },

  hero: { alignItems: 'center', gap: 4 },
  badgeWrap: { width: BADGE_SIZE, height: BADGE_SIZE, marginBottom: 10 },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.accentBadgeBg,
    borderWidth: 1,
    borderColor: colors.accentBadgeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.accentText,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textDim, textAlign: 'center' },
  prChipWrap: { marginTop: 10 },
  prChip: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBadgeBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  prChipText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accentText },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: spacing.xs },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.accentText, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: fontSize.xs, color: colors.textDim },

  recordsCardWrap: { width: '100%' },
  recordsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentBadgeBorder,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.xs,
  },
  recordsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
  recordsTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  recordInfo: { flex: 1, gap: 2 },
  recordName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  recordKind: { fontSize: fontSize.xs, color: colors.textDim },
  recordValues: { alignItems: 'flex-end', gap: 2 },
  recordValue: { fontSize: 16, fontWeight: '700', color: colors.accentText, fontVariant: ['tabular-nums'] },
  recordDelta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  recordDeltaText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.teal, fontVariant: ['tabular-nums'] },

  cloudBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cloudBannerText: { fontSize: fontSize.sm, color: colors.text },
  actions: { gap: 10 },
  fullWidth: { width: '100%' },
  shareButtonPlaceholder: { width: '100%', opacity: 0.7 },
});
