// src/screens/AccountScreen.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../lib/authContext';
import { logOut } from '../lib/auth';
import { colors, common, fontSize, Text } from '../theme';

export default function AccountScreen() {
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
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(user?.email ?? '?').charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.email}>{user?.email ?? user?.displayName ?? 'משתמש'}</Text>

      <TouchableOpacity style={common.dangerButton} onPress={handleSignOut} disabled={signingOut}>
        {signingOut ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Text style={common.dangerButtonText}>התנתקות</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
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
  avatarText: { color: colors.accent, fontSize: 32, fontWeight: '800' },
  email: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600', marginBottom: 40 },
});
