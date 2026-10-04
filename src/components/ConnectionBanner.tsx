// src/components/ConnectionBanner.tsx
// הודעות חיבור: באנר מלא (אימון פעיל, התחברות) ותג קטן (מסך המנוחה).
// כתום = אין חיבור, ירוק = החיבור חזר. כשהכול תקין (online) לא מוצג כלום.

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, iconSize, radius, spacing, Text, useTheme } from '../theme';
import type { Palette } from '../theme';
import type { ConnectionStatus } from '../lib/network';

interface ConnectionBannerProps {
  status: ConnectionStatus;
  title?: string;
  body?: string;
  restoredTitle?: string;
  restoredBody?: string;
}

export function ConnectionBanner({
  status,
  title = 'אין חיבור לאינטרנט',
  body,
  restoredTitle = 'החיבור חזר',
  restoredBody,
}: ConnectionBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (status === 'online') return null;
  const isOffline = status === 'offline';

  return (
    <View
      style={[styles.banner, isOffline ? styles.bannerOffline : styles.bannerRestored]}
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'cloud-done-outline'}
        size={iconSize.md}
        color={isOffline ? colors.warning : colors.success}
      />
      <View style={styles.textCol}>
        {(isOffline ? title : restoredTitle) ? (
          <Text style={styles.title}>{isOffline ? title : restoredTitle}</Text>
        ) : null}
        {(isOffline ? body : restoredBody) ? (
          <Text style={styles.body}>{isOffline ? body : restoredBody}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** תג קטן ללא טקסט ארוך - למסך המנוחה, כדי לא להפריע לספירה. מוצג רק כשאין חיבור. */
export function OfflinePill({ status, label = 'לא מחובר · נשמר על המכשיר' }: { status: ConnectionStatus; label?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (status !== 'offline') return null;
  return (
    <View style={styles.pill} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={iconSize.sm} color={colors.warning} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: 14,
      borderRadius: radius.lg - 2,
      borderWidth: 1,
    },
    bannerOffline: { backgroundColor: colors.warningSoft, borderColor: colors.warningBorder },
    bannerRestored: { backgroundColor: colors.successSoft, borderColor: colors.successBorder },
    textCol: { flex: 1, gap: 2 },
    title: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    body: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 18 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: colors.warningSoft,
      borderColor: colors.warningBorder,
    },
    pillText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  });
