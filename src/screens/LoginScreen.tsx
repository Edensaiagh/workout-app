// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
          {mode === 'signIn' ? 'התחברי כדי להמשיך' : 'צרי חשבון חדש'}
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>אימייל</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#5a5f68"
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
            placeholderTextColor="#5a5f68"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#141414" />
            ) : (
              <Text style={styles.primaryButtonText}>
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
            style={[styles.googleButton, googleSubmitting && styles.buttonDisabled]}
            onPress={handleGoogle}
            disabled={googleSubmitting}
          >
            {googleSubmitting ? (
              <ActivityIndicator color="#f1f0ec" />
            ) : (
              <Text style={styles.googleButtonText}>המשך עם Google</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f10' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '800', color: '#f1f0ec', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#9a9ca4', textAlign: 'center', marginTop: 6, marginBottom: 32 },
  form: { gap: 4 },
  label: { color: '#9a9ca4', fontSize: 13, fontWeight: '600', marginBottom: 6, textAlign: 'right' },
  input: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f1f0ec',
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 16,
  },
  errorText: { color: '#ff5b5b', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  primaryButton: {
    backgroundColor: '#ffb454',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#141414', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  switchModeText: {
    color: '#ffb454',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2c2c2e' },
  dividerText: { color: '#64666f', fontSize: 12, fontWeight: '600' },
  googleButton: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  googleButtonText: { color: '#f1f0ec', fontWeight: '700', fontSize: 15 },
});
