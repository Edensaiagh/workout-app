// src/screens/AccountScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../lib/authContext';
import { logOut } from '../lib/auth';
import { haptics } from '../lib/haptics';
import { SoundVibrationLab } from '../components/SoundVibrationLab';
import { fontSize, radius, spacing, touch, Text, useTheme } from '../theme';
import type { Palette, ThemeMode } from '../theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'לפי המכשיר' },
  { value: 'light', label: 'בהיר' },
  { value: 'dark', label: 'כהה' },
];

export default function AccountScreen() {
  const { colors, common, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert('להתנתק?', 'תצטרך להתחבר שוב כדי לראות את האימונים שלך.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'התנתקות',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await logOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(user?.email ?? '?').charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.email}>{user?.email ?? user?.displayName ?? 'משתמש'}</Text>

      <View style={styles.themeCard}>
        <Text style={styles.themeTitle}>מראה האפליקציה</Text>
        <View style={styles.segmented}>
          {THEME_OPTIONS.map((opt) => {
            const selected = mode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.segment, selected && styles.segmentSelected]}
                onPress={() => {
                  haptics.select();
                  setMode(opt.value);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.themeHint}>״לפי המכשיר״ עוקב אחרי ההגדרה של הטלפון.</Text>
      </View>

      <SoundVibrationLab />

      <TouchableOpacity style={[common.dangerButton, styles.signOut]} onPress={handleSignOut} disabled={signingOut}>
        {signingOut ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Text style={common.dangerButtonText}>התנתקות</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { alignItems: 'center', paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: colors.accentText, fontSize: 32, fontWeight: '800' },
  email: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.xxl },
  themeCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  themeTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  // flexDirection 'row' כבר RTL: "לפי המכשיר" מימין, "כהה" משמאל
  segmented: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: { backgroundColor: colors.accent },
  segmentText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  segmentTextSelected: { color: colors.onAccent },
  themeHint: { color: colors.textDim, fontSize: 12 },
  signOut: { width: '100%' },
});
