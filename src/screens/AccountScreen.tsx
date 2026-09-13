// src/screens/AccountScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../lib/authContext';
import { logOut } from '../lib/auth';

export default function AccountScreen() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert('להתנתק?', 'תצטרכי להתחבר שוב כדי לראות את האימונים שלך.', [
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

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={signingOut}>
        {signingOut ? (
          <ActivityIndicator color="#ff5b5b" />
        ) : (
          <Text style={styles.signOutText}>התנתקות</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f10', alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#ffb454', fontSize: 32, fontWeight: '800' },
  email: { color: '#f1f0ec', fontSize: 17, fontWeight: '600', marginBottom: 40 },
  signOutButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,91,91,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  signOutText: { color: '#ff5b5b', fontWeight: '700', fontSize: 15 },
});
