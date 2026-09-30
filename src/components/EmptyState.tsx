// src/components/EmptyState.tsx
//
// מצב ריק אחיד לכל המסכים: אייקון, כותרת, הסבר, ואופציונלית כפתור פעולה.

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, common, fontSize, spacing, Text } from '../theme';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color={colors.textDim} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={[common.primaryButton, styles.action]} onPress={onAction}>
          <Text style={common.primaryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: spacing.xl },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    color: colors.textDim,
    fontSize: fontSize.sm + 1,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: { marginTop: spacing.xl, paddingHorizontal: spacing.xxl },
});
