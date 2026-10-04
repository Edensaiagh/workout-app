// src/components/LoadErrorState.tsx
// מצב "לא הצלחנו לטעון" למסכי ההיסטוריה והניתוח, עם כפתור ניסיון חוזר.
// כשאין חיבור הוא מסביר את זה במפורש; אחרת מציג שגיאה כללית.

import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, iconSize, radius, spacing, touch, Text, useTheme } from '../theme';
import type { Palette } from '../theme';

interface LoadErrorStateProps {
  offline: boolean;
  /** מה לא נטען, בצורה שמשתלבת במשפט: "האימונים שלך", "נתוני הניתוח" */
  what: string;
  onRetry: () => void;
  /** כמה אימונים שמורים רק במכשיר וממתינים לסנכרון (מוצג רק כשאין חיבור) */
  pendingCount?: number;
}

function pendingLabel(count: number): string {
  return count === 1 ? 'אימון אחד ממתין לסנכרון' : `${count} אימונים ממתינים לסנכרון`;
}

export function LoadErrorState({ offline, what, onRetry, pendingCount = 0 }: LoadErrorStateProps) {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={38}
          color={colors.warning}
        />
      </View>
      <Text style={styles.title}>{offline ? 'אין חיבור לאינטרנט' : 'משהו השתבש'}</Text>
      <Text style={styles.subtitle}>
        {offline
          ? `לא הצלחנו לטעון את ${what}. אפשר לנסות שוב כשהחיבור יחזור.`
          : `לא הצלחנו לטעון את ${what}. אפשר לנסות שוב.`}
      </Text>

      {offline && pendingCount > 0 && (
        <View style={styles.pendingChip}>
          <Ionicons name="time-outline" size={iconSize.sm} color={colors.accentText} />
          <Text style={styles.pendingText}>{pendingLabel(pendingCount)}</Text>
        </View>
      )}

      <TouchableOpacity style={[common.secondaryButton, styles.retryButton]} onPress={onRetry}>
        <Text style={common.secondaryButtonText}>ניסיון חוזר</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    iconCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
    subtitle: {
      color: colors.textDim,
      fontSize: fontSize.md,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 300,
    },
    pendingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: colors.accentBadgeBg,
      borderColor: colors.accentBadgeBorder,
      marginTop: spacing.xs,
    },
    pendingText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
    retryButton: { minWidth: 160, marginTop: spacing.sm, borderRadius: radius.md, minHeight: touch.button },
  });
