// src/lib/sound.ts
// צלילי מנוחה. צליל סיום המנוחה מנוגן פעם אחת בלבד, מנגן יחיד (useAudioPlayer) שה-hook משחרר
// לבד ביציאה מהמסך.
//
// למה זה לא חוזר על הבאג הישן (ציפצופים שלא נפסקים, בעיה #8 בקובץ ההתקדמות):
// ב-Android נגן שהסתיים ומקבל seekTo(0) כשהוא עדיין במצב "ינגן" מתחיל מחדש לבד, מה שמפעיל שוב
// didJustFinish, וחוזר חלילה. לכן:
// - בסיום הניגון מבצעים pause() בלבד (עוצר גם אם הנגן התחיל מחדש), ולא seekTo.
// - האיפוס לתחילת הקובץ נעשה בתחילת המנוחה הבאה (primeDone), כשהנגן כבר מושהה - לא בסיום.
// - פעם אחת בלבד לכל מנוחה, בלי קשר לכמה פעמים קראו ל-playDone.

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
  } catch (e) {
    audioModeReady = false; // ננסה שוב בפעם הבאה
    console.warn('rest sound: setAudioModeAsync failed', e);
  }
}

export function useRestSounds() {
  const donePlayer = useAudioPlayer(restDoneSource);
  const hasPlayedThisRest = useRef(false);

  useEffect(() => {
    ensureAudioMode();
    const sub = donePlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        try {
          donePlayer.pause(); // עוצר גם אם הנגן ניסה להתחיל מחדש - חוסם לולאה
        } catch (e) {
          console.warn('rest sound: pause after finish failed', e);
        }
      }
    });
    return () => sub.remove();
  }, [donePlayer]);

  // קוראים לזה בתחילת כל מנוחה: מאפסים את הנגן לתחילת הקובץ כשהוא מושהה
  const primeDone = useCallback(() => {
    hasPlayedThisRest.current = false;
    try {
      donePlayer.pause();
      donePlayer.seekTo(0);
    } catch (e) {
      console.warn('rest sound: reset failed', e);
    }
  }, [donePlayer]);

  const playTick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const playDone = useCallback(() => {
    if (hasPlayedThisRest.current) return;
    hasPlayedThisRest.current = true;
    try {
      donePlayer.play();
    } catch (e) {
      console.warn('rest sound: play failed', e);
    }
  }, [donePlayer]);

  return { playTick, playDone, primeDone };
}
