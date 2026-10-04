// src/components/SoundVibrationLab.tsx
// מעבדה זמנית במסך החשבון: לנסות כמה צלילי סיום מנוחה וכמה תבניות רטט, ולבחור מה מתאים.
// אחרי שהבחירה נעשית, הצליל והרטט שנבחרו נקבעים בקוד והמעבדה מוסרת.

import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Vibration } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { ensureAudioMode } from '../lib/sound';
import { fontSize, radius, spacing, Text, useTheme } from '../theme';
import type { Palette } from '../theme';

const SOUNDS = [
  { label: '1. צפצוף כפול (הנוכחי)', source: require('../../assets/sounds/options/double-beep.wav') },
  { label: '2. פעמון', source: require('../../assets/sounds/options/bell.wav') },
  { label: '3. צליל עולה', source: require('../../assets/sounds/options/chime-up.wav') },
  { label: '4. נקישה כפולה', source: require('../../assets/sounds/options/double-tick.wav') },
  { label: '5. צפצוף ארוך', source: require('../../assets/sounds/options/long-beep.wav') },
  { label: '6. גונג נמוך', source: require('../../assets/sounds/options/low-gong.wav') },
];

// באנדרואיד אפשר לשלוט באורך הרטט אבל לא בעוצמה שלו. לכן ההבדל בין האפשרויות הוא באורך ובמספר הפולסים.
const VIBRATIONS: { label: string; pattern: number[] }[] = [
  { label: 'א. נקישה עדינה', pattern: [0, 80] },
  { label: 'ב. פולס קצר אחד', pattern: [0, 150] },
  { label: 'ג. שני פולסים קצרים', pattern: [0, 100, 90, 100] },
  { label: 'ד. שלושה פולסים קצרים', pattern: [0, 90, 90, 90, 90, 90] },
  { label: 'ה. שני פולסים בינוניים (הנוכחי)', pattern: [0, 250, 120, 250] },
  { label: 'ו. פולס ארוך אחד', pattern: [0, 450] },
];

function SoundRow({ label, source, styles, buttonStyle, textStyle }: any) {
  const player = useAudioPlayer(source);
  const play = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // מעבדה זמנית - אם נכשל פשוט לא נשמע
    }
  };
  return (
    <TouchableOpacity style={[buttonStyle, styles.optionButton]} onPress={play}>
      <Text style={textStyle}>▶ {label}</Text>
    </TouchableOpacity>
  );
}

export function SoundVibrationLab() {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    ensureAudioMode();
  }, []);

  const vibrate = (pattern: number[]) => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>בחירת צליל ורטט (זמני)</Text>

      <Text style={styles.sectionTitle}>צלילים</Text>
      {SOUNDS.map((s) => (
        <SoundRow
          key={s.label}
          label={s.label}
          source={s.source}
          styles={styles}
          buttonStyle={common.secondaryButton}
          textStyle={common.secondaryButtonText}
        />
      ))}
      <Text style={styles.hint}>בכל צליל יש שקט קצר בהתחלה, זה בכוונה (כדי שהרמקול יספיק להתעורר).</Text>

      <Text style={styles.sectionTitle}>רטט</Text>
      {VIBRATIONS.map((v) => (
        <TouchableOpacity
          key={v.label}
          style={[common.secondaryButton, styles.optionButton]}
          onPress={() => vibrate(v.pattern)}
        >
          <Text style={common.secondaryButtonText}>📳 {v.label}</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.hint}>באנדרואיד אי אפשר לשנות את עוצמת הרטט, רק את האורך ומספר הפולסים.</Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    title: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    sectionTitle: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: '700', marginTop: spacing.sm },
    optionButton: { width: '100%' },
    hint: { color: colors.textDim, fontSize: 12 },
  });
