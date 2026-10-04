// src/lib/sound.ts
// צלילי מנוחה. צליל סיום המנוחה מנוגן פעם אחת בלבד, מנגן יחיד (useAudioPlayer) שה-hook משחרר
// לבד ביציאה מהמסך.
//
// למה זה לא חוזר על הבאג הישן (ציפצופים שלא נפסקים, בעיה #8 בקובץ ההתקדמות):
// ב-Android נגן שהסתיים ומקבל seekTo(0) בזמן שהוא עדיין במצב "ינגן" מתחיל מחדש לבד, מה שמפעיל
// שוב didJustFinish, וחוזר חלילה. לכן בסיום קודם עושים pause() ורק אחריו seekTo(0), כך שהנגן
// מושהה כשהוא חוזר להתחלה ולא יכול לנגן לבד. בנוסף:
// - פעם אחת בלבד לכל מנוחה, בלי קשר לכמה פעמים קראו ל-playDone.
// - מפסק ביטחון: אם didJustFinish מגיע יותר מפעמיים באותה מנוחה, רק עוצרים ולא מאפסים יותר.

import { useCallback, useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const restDoneSource = require('../../assets/sounds/rest-done.wav');

const MAX_RESETS_PER_REST = 2;

// יומן אבחון זמני (מוצג ב-SoundDiagnosticCard במסך החשבון). להסיר יחד עם הכרטיס.
let soundLog: string[] = [];
const soundLogListeners = new Set<() => void>();

function stamp(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function logSound(message: string) {
  soundLog = [...soundLog.slice(-11), `${stamp()} ${message}`];
  soundLogListeners.forEach((l) => l());
}

export function getSoundLog(): string[] {
  return soundLog;
}

export function clearSoundLog() {
  soundLog = [];
  soundLogListeners.forEach((l) => l());
}

export function subscribeSoundLog(listener: () => void): () => void {
  soundLogListeners.add(listener);
  return () => {
    soundLogListeners.delete(listener);
  };
}

let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true, // הצפצוף חשוב - שיישמע גם כשהטלפון על שקט
      interruptionMode: 'duckOthers', // מנמיך מוזיקה שמתנגנת מהאוזניות במקום לעצור אותה
    });
  } catch {
    audioModeReady = false; // ננסה שוב בפעם הבאה
  }
}

export function useRestSounds() {
  const donePlayer = useAudioPlayer(restDoneSource);
  const hasPlayedThisRest = useRef(false);
  const resetsThisRest = useRef(0);

  useEffect(() => {
    ensureAudioMode();
    const sub = donePlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish || status.playing) {
        logSound(`status: state=${status.playbackState} playing=${status.playing} finished=${status.didJustFinish}`);
      }
      if (!status.didJustFinish) return;
      try {
        donePlayer.pause(); // קודם עוצרים - כך האיפוס לא יכול להפעיל את הנגן מחדש
        if (resetsThisRest.current < MAX_RESETS_PER_REST) {
          resetsThisRest.current += 1;
          donePlayer.seekTo(0);
        }
      } catch {
        // אם העצירה/האיפוס נכשלו אין מה לעשות - לא מפילים את האפליקציה בגלל צליל
      }
    });
    return () => sub.remove();
  }, [donePlayer]);

  // קוראים לזה בתחילת כל מנוחה: מאפסים את הספירות של המנוחה הנוכחית
  const primeDone = useCallback(() => {
    hasPlayedThisRest.current = false;
    resetsThisRest.current = 0;
    logSound('rest started (primeDone)');
  }, []);

  const playTick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const playDone = useCallback(() => {
    if (hasPlayedThisRest.current) {
      logSound('playDone ignored (already played this rest)');
      return;
    }
    hasPlayedThisRest.current = true;
    logSound(
      `playDone: before play loaded=${donePlayer.isLoaded} playing=${donePlayer.playing} t=${donePlayer.currentTime} vol=${donePlayer.volume} muted=${donePlayer.muted}`
    );
    try {
      donePlayer.play();
      logSound('play() returned');
      setTimeout(() => {
        logSound(`300ms later: playing=${donePlayer.playing} t=${donePlayer.currentTime}`);
      }, 300);
    } catch (e) {
      logSound(`play() threw: ${String(e)}`);
    }
  }, [donePlayer]);

  return { playTick, playDone, primeDone };
}
