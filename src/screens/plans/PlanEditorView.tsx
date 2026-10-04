// src/screens/plans/PlanEditorView.tsx
// יצירה ועריכה של אימון שמור: שם, תרגילים, מספר סטים ומשקל לכל סט.
// כתיבת משקל בסט מציעה אותו אוטומטית לכל הסטים שאחריו באותו תרגיל (אפשר לשנות כל סט בנפרד).
// בתרגיל דו-צדדי יש משקל נפרד לימין ולשמאל, כמו באימון עצמו.

import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExerciseNamePicker from '../../components/ExerciseNamePicker';
import { getExerciseKind } from '../../constants/exerciseLibrary';
import { savePlan } from '../../lib/planService';
import type { WorkoutPlan } from '../../types/plan';
import { fontSize, iconSize, radius, spacing, touch, Text, TextInput, useTheme } from '../../theme';
import type { Palette } from '../../theme';

interface SetDraft {
  weight: string;
  weightLeft: string; // רק בדו-צדדי
}
interface ExerciseDraft {
  id: string;
  name: string;
  sets: SetDraft[];
}

const MAX_SETS = 20;
const DEFAULT_SETS = 3;
const genId = () => Math.random().toString(36).slice(2, 10);

interface Props {
  userId: string;
  initial: WorkoutPlan | null;
  personalHistory: string[];
  /** המשקל האחרון שנרשם לתרגיל (מהיסטוריית האימונים), להצעה ראשונית */
  suggestWeight: (name: string) => { right: number; left: number } | undefined;
  onClose: () => void;
  onSaved: () => void;
}

export default function PlanEditorView({ userId, initial, personalHistory, suggestWeight, onClose, onSaved }: Props) {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(initial?.name ?? '');
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    () =>
      initial?.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        sets: e.sets.map((s) => ({ weight: String(s.weight), weightLeft: String(s.weightLeft ?? s.weight) })),
      })) ?? []
  );
  // null = סגור; 'new' = הוספת תרגיל; אחרת מזהה התרגיל ששמו נערך
  const [pickerFor, setPickerFor] = useState<string | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (id: string, fn: (e: ExerciseDraft) => ExerciseDraft) =>
    setExercises((list) => list.map((e) => (e.id === id ? fn(e) : e)));

  const addExercise = (exName: string) => {
    const remembered = suggestWeight(exName);
    const w = remembered ? String(remembered.right) : '';
    const wl = remembered ? String(remembered.left) : '';
    setExercises((list) => [
      ...list,
      { id: genId(), name: exName, sets: Array.from({ length: DEFAULT_SETS }, () => ({ weight: w, weightLeft: wl })) },
    ]);
  };

  // כתיבת משקל ימין (או המשקל היחיד) בסט i: כל הסטים שאחריו מקבלים את אותו משקל.
  // בדו-צדדי, שמאל של אותו סט ושל הסטים שאחריו עוקב אחרי ימין, אלא אם שונה ממנו (הוגדר בנפרד).
  const setWeight = (exId: string, i: number, text: string) =>
    update(exId, (e) => ({
      ...e,
      sets: e.sets.map((s, j) => {
        if (j < i) return s;
        const followsRight = s.weightLeft === s.weight;
        return { weight: text, weightLeft: followsRight ? text : s.weightLeft };
      }),
    }));

  const setWeightLeft = (exId: string, i: number, text: string) =>
    update(exId, (e) => ({
      ...e,
      sets: e.sets.map((s, j) => (j < i ? s : { ...s, weightLeft: text })),
    }));

  const changeSetCount = (exId: string, delta: number) =>
    update(exId, (e) => {
      const next = e.sets.length + delta;
      if (next < 1 || next > MAX_SETS) return e;
      if (delta < 0) return { ...e, sets: e.sets.slice(0, next) };
      const last = e.sets[e.sets.length - 1] ?? { weight: '', weightLeft: '' };
      return { ...e, sets: [...e.sets, { ...last }] };
    });

  const removeExercise = (exId: string) => setExercises((list) => list.filter((e) => e.id !== exId));

  const parseW = (t: string) => {
    const n = t.trim() === '' ? 0 : parseFloat(t.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('חסר שם', 'יש לתת שם לאימון, למשל "יום חזה".');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('אין תרגילים', 'יש להוסיף לפחות תרגיל אחד.');
      return;
    }
    setSaving(true);
    const now = Date.now();
    const plan: WorkoutPlan = {
      id: initial?.id ?? genId(),
      userId,
      name: name.trim(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      exercises: exercises.map((e) => {
        const unilateral = getExerciseKind(e.name) === 'unilateral';
        return {
          id: e.id,
          name: e.name,
          sets: e.sets.map((s) => ({
            weight: parseW(s.weight),
            ...(unilateral ? { weightLeft: parseW(s.weightLeft) } : {}),
          })),
        };
      }),
    };
    try {
      const result = await savePlan(plan);
      if (result.savedTo === 'local') {
        Alert.alert('נשמר על המכשיר', 'אין חיבור כרגע. האימון נשמר על המכשיר ויישלח לענן כשיהיה חיבור.');
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const confirmClose = () => {
    const hasContent = name.trim() !== '' || exercises.length > 0;
    if (!hasContent) return onClose();
    Alert.alert('לצאת בלי לשמור?', 'השינויים באימון לא יישמרו.', [
      { text: 'להמשיך לערוך', style: 'cancel' },
      { text: 'יציאה', style: 'destructive', onPress: onClose },
    ]);
  };

  const pickerExercise = pickerFor && pickerFor !== 'new' ? exercises.find((e) => e.id === pickerFor) : undefined;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={confirmClose} style={common.iconButton} accessibilityLabel="חזרה">
            <Ionicons name="chevron-forward" size={iconSize.md} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{initial ? 'עריכת אימון' : 'אימון חדש'}</Text>
        </View>

        <Text style={styles.label}>שם האימון</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="למשל: יום חזה וכתפיים"
          placeholderTextColor={colors.textFaint}
          maxLength={40}
        />

        {exercises.map((e) => {
          const kind = getExerciseKind(e.name);
          const unilateral = kind === 'unilateral';
          const weightLabel = kind === 'assisted' ? 'עזרה לכל סט (ק״ג)' : 'משקל לכל סט (ק״ג)';
          return (
            <View key={e.id} style={styles.card}>
              <View style={styles.cardHead}>
                <TouchableOpacity style={styles.nameBtn} onPress={() => setPickerFor(e.id)}>
                  <Text style={styles.exName} numberOfLines={2}>{e.name}</Text>
                  {kind !== 'regular' && (
                    <View style={styles.kindTag}>
                      <Text style={styles.kindTagText}>{unilateral ? 'דו-צדדי' : 'עם עזרה'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeExercise(e.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="הסרת התרגיל">
                  <Text style={styles.removeX}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.countRow}>
                <Text style={styles.label}>מספר סטים</Text>
                <View style={styles.countControls}>
                  <TouchableOpacity style={styles.countBtn} onPress={() => changeSetCount(e.id, -1)} accessibilityLabel="פחות סטים">
                    <Text style={styles.countBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.countValue}>{e.sets.length}</Text>
                  <TouchableOpacity style={styles.countBtn} onPress={() => changeSetCount(e.id, 1)} accessibilityLabel="יותר סטים">
                    <Text style={styles.countBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>{weightLabel}</Text>
              {unilateral && (
                <View style={styles.sideLegend}>
                  <Text style={[styles.sideLegendText, { color: colors.teal }]}>ימין</Text>
                  <Text style={[styles.sideLegendText, { color: colors.purple }]}>שמאל</Text>
                </View>
              )}
              <View style={styles.setsWrap}>
                {e.sets.map((s, i) => (
                  <View key={i} style={styles.setBox}>
                    <Text style={styles.setBoxLabel}>סט {i + 1}</Text>
                    <TextInput
                      style={[styles.weightInput, { borderColor: unilateral ? colors.teal : colors.info }]}
                      value={s.weight}
                      onChangeText={(t) => setWeight(e.id, i, t)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textFaint}
                      selectTextOnFocus
                    />
                    {unilateral && (
                      <TextInput
                        style={[styles.weightInput, styles.weightInputLeft, { borderColor: colors.purple }]}
                        value={s.weightLeft}
                        onChangeText={(t) => setWeightLeft(e.id, i, t)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textFaint}
                        selectTextOnFocus
                      />
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.hint}>משקל שכותבים בסט מוצע אוטומטית לסטים שאחריו, ואפשר לשנות כל סט בנפרד.</Text>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addExercise} onPress={() => setPickerFor('new')}>
          <Text style={styles.addExerciseText}>+ הוספת תרגיל</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[common.primaryButton, styles.saveBtn, saving && common.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={common.primaryButtonText}>{saving ? 'שומר...' : 'שמירת האימון'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExerciseNamePicker
        visible={pickerFor !== null}
        currentName={pickerExercise?.name ?? ''}
        personalHistory={personalHistory}
        onClose={() => setPickerFor(null)}
        onConfirm={(picked) => {
          const trimmed = picked.trim();
          if (trimmed) {
            if (pickerFor === 'new') addExercise(trimmed);
            else if (pickerFor) update(pickerFor, (e) => ({ ...e, name: trimmed }));
          }
          setPickerFor(null);
        }}
      />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingTop: 56, paddingBottom: spacing.xxl * 2, gap: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    label: { color: colors.textDim, fontSize: fontSize.sm },
    nameInput: {
      minHeight: touch.button,
      borderWidth: 2,
      borderColor: colors.info,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: '700',
      textAlign: 'right',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    nameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    exName: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', flexShrink: 1 },
    kindTag: {
      backgroundColor: colors.accentBadgeBg,
      borderWidth: 1,
      borderColor: colors.accentBadgeBorder,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 20,
    },
    kindTagText: { color: colors.accentText, fontSize: 11, fontWeight: '700' },
    removeX: { color: colors.danger, fontSize: fontSize.md, fontWeight: '700' },
    countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    countControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    countBtn: {
      width: touch.min,
      height: touch.min,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countBtnText: { color: colors.text, fontSize: 20, fontWeight: '700' },
    countValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700', minWidth: 24, textAlign: 'center' },
    sideLegend: { flexDirection: 'row', gap: spacing.md },
    sideLegendText: { fontSize: fontSize.xs, fontWeight: '700' },
    setsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    setBox: { width: '22%', minWidth: 70, alignItems: 'center', gap: 4 },
    setBoxLabel: { color: colors.textDim, fontSize: 11 },
    weightInput: {
      width: '100%',
      minHeight: touch.min,
      borderWidth: 1,
      borderRadius: radius.sm + 2,
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: '700',
      textAlign: 'center',
      paddingVertical: 4,
    },
    weightInputLeft: { marginTop: 2 },
    hint: { color: colors.textFaint, fontSize: fontSize.xs, textAlign: 'center' },
    addExercise: {
      minHeight: touch.button,
      borderRadius: radius.md + 2,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addExerciseText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
    saveBtn: { marginTop: spacing.sm },
  });
