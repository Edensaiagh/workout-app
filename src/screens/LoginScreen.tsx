// src/screens/LoginScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  authErrorMessage,
} from '../lib/auth';
import { fontSize, radius, spacing, touch, Text, TextInput, useTheme } from '../theme';
import type { Palette } from '../theme';
import { useIsOffline } from '../lib/network';
import { ConnectionBanner } from '../components/ConnectionBanner';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const offline = useIsOffline();
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const canSubmit = email.trim() !== '' && password.length >= 6 && !submitting;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      // שגיאות Google (למשל "לא זמין ב-Expo Go") הן Error רגיל עם הודעה קריאה,
      // בניגוד לשגיאות Firebase Auth שיש להן קוד ולעבור דרך authErrorMessage
      setError(err instanceof Error && !('code' in err) ? err.message : authErrorMessage(err));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Bizi 365</Text>
        <Text style={styles.subtitle}>
          {mode === 'signIn' ? 'התחבר כדי להמשיך' : 'צור חשבון חדש'}
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>אימייל</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>סיסמה</Text>
          <TextInput
            style={styles.input}
            placeholder="לפחות 6 תווים"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          {offline ? (
            <View style={styles.offlineWrap}>
              <ConnectionBanner
                status="offline"
                title=""
                body="אין חיבור לאינטרנט. כדי להתחבר צריך חיבור, אפשר לנסות שוב כשהוא יחזור."
              />
            </View>
          ) : (
            error && <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[common.primaryButton, styles.submitButton, !canSubmit && common.disabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={common.primaryButtonText}>
                {mode === 'signIn' ? 'התחברות' : 'הרשמה'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setError(null);
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            }}
          >
            <Text style={styles.switchModeText}>
              {mode === 'signIn' ? 'אין לך חשבון? הרשמה' : 'כבר יש לך חשבון? התחברות'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>או</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[common.secondaryButton, googleSubmitting && common.disabled]}
            onPress={handleGoogle}
            disabled={googleSubmitting}
          >
            {googleSubmitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={common.secondaryButtonText}>המשך עם Google</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.textDim, textAlign: 'center', marginTop: 6, marginBottom: spacing.xxl },
  form: { gap: spacing.xs },
  label: { color: colors.textDim, fontSize: fontSize.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: touch.button,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  offlineWrap: { marginBottom: spacing.md },
  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.md },
  submitButton: { marginTop: spacing.xs },
  switchModeText: {
    color: colors.accentText,
    fontSize: fontSize.sm + 1,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.textFaint, fontSize: 12, fontWeight: '600' },
});
