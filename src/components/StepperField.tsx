// src/components/StepperField.tsx
//
// שדה מספר עם כפתורי + / −: מספר גדול באמצע (אפשר להקליד), ומתחתיו שני כפתורים גדולים.
// לחיצה ארוכה על כפתור משנה את הערך שוב ושוב (מואץ), עם רטט קל בכל צעד.

import React, { useEffect, useRef, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../lib/haptics';
import { iconSize, radius, Text, TextInput, useTheme } from '../theme';
import type { Palette } from '../theme';

interface StepperFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** גודל צעד ללחיצה אחת */
  step: number;
  /** ערך מינימלי (ברירת מחדל 0) */
  min?: number;
  /** מספר ספרות אחרי הנקודה בפורמט התוצאה (0 למספרים שלמים) */
  decimals?: number;
  keyboardType: 'decimal-pad' | 'number-pad';
  borderColor: string;
  minusLabel: string;
  plusLabel: string;
}

const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 90;

function format(n: number, decimals: number): string {
  // מסירים אפסים מיותרים: 82.50 -> 82.5, 80.0 -> 80
  return String(parseFloat(n.toFixed(decimals)));
}

export function StepperField({
  label,
  value,
  onChangeText,
  step,
  min = 0,
  decimals = 0,
  keyboardType,
  borderColor,
  minusLabel,
  plusLabel,
}: StepperFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // הערך העדכני נשמר ב-ref כדי שה-interval של לחיצה ארוכה לא "יתקע" על ערך ישן
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChangeText);
  onChangeRef.current = onChangeText;

  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (delayTimer.current) clearTimeout(delayTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    delayTimer.current = null;
    repeatTimer.current = null;
  };

  useEffect(() => stop, []);

  const applyStep = (dir: 1 | -1) => {
    const current = parseFloat(valueRef.current);
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.max(min, base + dir * step);
    if (next === base) return;
    const text = format(next, decimals);
    valueRef.current = text; // כדי שהצעד הבא (לפני re-render) ימשיך מהערך החדש
    onChangeRef.current(text);
    haptics.select();
  };

  const start = (dir: 1 | -1) => {
    stop();
    applyStep(dir);
    delayTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => applyStep(dir), HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  };

  return (
    <View style={[styles.card, { borderColor }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
        selectTextOnFocus
      />
      {/* ב-RTL הילד הראשון בימין: + מימין ו− משמאל, כמו במוקאפ */}
      <View style={styles.buttonsRow}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonPlus, pressed && styles.pressed]}
          onPressIn={() => start(1)}
          onPressOut={stop}
          accessibilityRole="button"
          accessibilityLabel={plusLabel}
        >
          <Ionicons name="add" size={iconSize.md} color={colors.onAccent} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonMinus, pressed && styles.pressed]}
          onPressIn={() => start(-1)}
          onPressOut={stop}
          accessibilityRole="button"
          accessibilityLabel={minusLabel}
        >
          <Ionicons name="remove" size={iconSize.md} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: 10,
    gap: 6,
  },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  input: {
    height: 48,
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  buttonsRow: { flexDirection: 'row', gap: 6 },
  button: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPlus: { backgroundColor: colors.accent, borderColor: colors.accent },
  buttonMinus: { backgroundColor: colors.surfaceHigh, borderColor: colors.lineStrong },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
