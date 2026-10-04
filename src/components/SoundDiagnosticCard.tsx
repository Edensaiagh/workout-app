// src/components/SoundDiagnosticCard.tsx
// כרטיס אבחון זמני למסך החשבון: מנגן את צליל סיום המנוחה ישירות (בלי זרימת המנוחה) ומציג
// על המסך מה הנגן מדווח. נועד לבודד האם הבעיה בצליל עצמו או בזרימת המנוחה.
// להסיר אחרי שהצליל עובד.

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { haptics } from '../lib/haptics';
import { clearSoundLog, getSoundLog, subscribeSoundLog } from '../lib/sound';
import { fontSize, radius, spacing, Text, useTheme } from '../theme';
import type { Palette } from '../theme';

const source = require('../../assets/sounds/rest-done.wav');

export function SoundDiagnosticCard() {
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const [modeResult, setModeResult] = useState('לא הופעל');
  const [lastAction, setLastAction] = useState('—');
  const [finishCount, setFinishCount] = useState(0);
  const restLog = useSyncExternalStore(subscribeSoundLog, getSoundLog);

  useEffect(() => {
    if (status.didJustFinish) setFinishCount((n) => n + 1);
  }, [status.didJustFinish]);

  const applyMode = async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
      setModeResult('הצליח');
    } catch (e) {
      setModeResult(`נכשל: ${String(e)}`);
    }
  };

  const playSound = () => {
    try {
      player.play();
      setLastAction('play() נקרא בלי שגיאה');
    } catch (e) {
      setLastAction(`play() זרק שגיאה: ${String(e)}`);
    }
  };

  const resetSound = () => {
    try {
      player.pause();
      player.seekTo(0);
      setLastAction('pause + seekTo(0) נקראו');
    } catch (e) {
      setLastAction(`איפוס זרק שגיאה: ${String(e)}`);
    }
  };

  const line = (label: string, value: string | number | boolean) => (
    <Text style={styles.line}>
      {label}: {String(value)}
    </Text>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>אבחון צליל (זמני)</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[common.secondaryButton, styles.flexOne]} onPress={playSound}>
          <Text style={common.secondaryButtonText}>נגן צליל</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[common.secondaryButton, styles.flexOne]} onPress={() => haptics.restDone()}>
          <Text style={common.secondaryButtonText}>רטט סיום</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={[common.secondaryButton, styles.flexOne]} onPress={applyMode}>
          <Text style={common.secondaryButtonText}>הפעל מצב שמע</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[common.secondaryButton, styles.flexOne]} onPress={resetSound}>
          <Text style={common.secondaryButtonText}>אפס נגן</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statusBox}>
        {line('מצב שמע', modeResult)}
        {line('פעולה אחרונה', lastAction)}
        {line('נטען', status.isLoaded)}
        {line('משך (שניות)', status.duration)}
        {line('מצב ניגון', status.playbackState)}
        {line('מנגן עכשיו', status.playing)}
        {line('מושתק (mute)', status.mute)}
        {line('לולאה', status.loop)}
        {line('סיום ניגון (פעמים)', finishCount)}
      </View>
      <View style={styles.logHeader}>
        <Text style={styles.title}>יומן המנוחה האחרונה</Text>
        <TouchableOpacity onPress={clearSoundLog}>
          <Text style={styles.clear}>נקה</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statusBox}>
        {restLog.length === 0 ? (
          <Text style={styles.line}>אין עדיין - תסיימי מנוחה באימון ותחזרי לכאן</Text>
        ) : (
          restLog.map((entry, i) => (
            <Text key={i} style={styles.logLine}>
              {entry}
            </Text>
          ))
        )}
      </View>
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
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    title: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    row: { flexDirection: 'row', gap: spacing.sm },
    flexOne: { flex: 1 },
    statusBox: { gap: 2 },
    line: { color: colors.textDim, fontSize: 12 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    clear: { color: colors.accentText, fontSize: 13, fontWeight: '700' },
    logLine: { color: colors.textDim, fontSize: 11, textAlign: 'left', writingDirection: 'ltr' },
  });
