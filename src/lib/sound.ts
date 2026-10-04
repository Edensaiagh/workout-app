// src/lib/sound.ts
// צלילי מנוחה. צליל סיום המנוחה מנוגן פעם אחת בלבד, מנגן יחיד (useAudioPlayer) שה-hook משחרר
// לבד ביציאה מהמסך.
//
// למה זה לא חוזר על הבאג הישן (ציפצופים שלא נפסקים, בעיה #8 בקובץ ההתקדמות):
// - אין ניגון בכל שנייה: ה-tick של 5 השניות האחרונות נשאר רטט קל בלבד, והצליל רק בסיום.
// - אין seekTo לפני play (זה גרם לדיליי ב-bridge, ראו CHANGELOG): האיפוס לתחילת הקובץ קורה
//   רק אחרי didJustFinish, ובינתיים קריאה חוזרת ל-playDone מתעלמת מעצמה.

import { useCallback, useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const restDoneSource = require('../../assets/sounds/rest-done.wav');

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
  const isPlayingDone = useRef(false);

  useEffect(() => {
    ensureAudioMode();
    const sub = donePlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        isPlayingDone.current = false;
        try {
          donePlayer.seekTo(0); // מכינים את הניגון הבא רק אחרי שהנוכחי באמת הסתיים
        } catch {
          // אם האיפוס נכשל, הניגון הבא פשוט יתחיל מהמקום שבו עצר
        }
      }
    });
    return () => sub.remove();
  }, [donePlayer]);

  const playTick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const playDone = useCallback(() => {
    if (isPlayingDone.current) return;
    isPlayingDone.current = true;
    try {
      donePlayer.play();
    } catch {
      isPlayingDone.current = false;
    }
  }, [donePlayer]);

  return { playTick, playDone };
}
