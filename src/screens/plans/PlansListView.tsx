// src/screens/plans/PlansListView.tsx
// רשימת האימונים השמורים: התחלה, עריכה ומחיקה.

import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutPlan } from '../../types/plan';
import { fontSize, iconSize, radius, spacing, touch, Text, useTheme } from '../../theme';
import type { Palette } from '../../theme';

interface Props {
  plans: WorkoutPlan[];
  onBack: () => void;
  onStart: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export default function PlansListView({ plans, onBack, onStart, onEdit, onDelete }: Props) {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const confirmDelete = (plan: WorkoutPlan) =>
    Alert.alert(`למחוק את "${plan.name}"?`, 'אימונים שכבר בוצעו לפי האימון הזה יישארו בהיסטוריה.', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => onDelete(plan) },
    ]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={common.iconButton} accessibilityLabel="חזרה">
          <Ionicons name="chevron-forward" size={iconSize.md} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>האימונים שלי</Text>
      </View>

      {plans.length === 0 && <Text style={styles.empty}>אין עדיין אימונים שמורים.</Text>}

      {plans.map((plan) => {
        const setCount = plan.exercises.reduce((n, e) => n + e.sets.length, 0);
        return (
          <View key={plan.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
              <Text style={styles.meta}>{plan.exercises.length} תרגילים · {setCount} סטים</Text>
            </View>
            <Text style={styles.names}>{plan.exercises.map((e) => e.name).join(' · ')}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[common.primaryButton, styles.startBtn]} onPress={() => onStart(plan)}>
                <Text style={common.primaryButtonText}>התחל אימון</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(plan)} accessibilityLabel="עריכה">
                <Ionicons name="create-outline" size={iconSize.sm} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={() => confirmDelete(plan)} accessibilityLabel="מחיקה">
                <Ionicons name="trash-outline" size={iconSize.sm} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <Text style={styles.footnote}>מחיקת אימון שמור לא מוחקת אימונים שכבר בוצעו בהיסטוריה.</Text>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingTop: 56, paddingBottom: spacing.xxl * 2, gap: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    planName: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', flexShrink: 1 },
    meta: { color: colors.textDim, fontSize: fontSize.xs },
    names: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    startBtn: { flex: 1 },
    iconBtn: {
      width: touch.button,
      height: touch.button,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnDanger: { borderColor: colors.dangerBorder },
    footnote: { color: colors.textDim, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.sm },
  });
