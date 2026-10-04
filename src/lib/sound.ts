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
  }, []);

  const playTick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const playDone = useCallback(() => {
    if (hasPlayedThisRest.current) return;
    hasPlayedThisRest.current = true;
    try {
      donePlayer.play();
    } catch {
      // לא מפילים את האפליקציה בגלל צליל
    }
  }, [donePlayer]);

  return { playTick, playDone, primeDone };
}
