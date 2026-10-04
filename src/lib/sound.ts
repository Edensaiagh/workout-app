// src/lib/sound.ts
// צלילי מנוחה. צליל סיום המנוחה מנוגן פעם אחת בלבד, בנגן חד־פעמי:
// נוצר מראש כשהמנוחה מתחילה (primeDone), מנגן פעם אחת בסיום (playDone), ומשוחרר מיד אחר כך.
//
// למה זה לא חוזר על הבאג הישן (ציפצופים שלא נפסקים, בעיה #8 בקובץ ההתקדמות):
// הגרסה הקודמת של הקובץ הזה איפסה את הנגן עם seekTo(0) אחרי didJustFinish. נגן שסיים ומקבל seek
// לתחילה יכול להתחיל לנגן מחדש, מה שמפעיל שוב didJustFinish, וחוזר חלילה - לולאה אינסופית.
// כאן אין seekTo בכלל, אין שימוש חוזר בנגן, ו-loop מכובה במפורש, ולכן אין דרך להיכנס ללולאה.
// בנוסף יש טיימר ביטחון שמשחרר את הנגן גם אם didJustFinish לא הגיע.

import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const restDoneSource = require('../../assets/sounds/rest-done.wav');

const RELEASE_FAILSAFE_MS = 3000; // הצליל באורך 0.4 שניות; אחרי 3 שניות משחררים בכל מקרה

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

function createDonePlayer(): AudioPlayer | null {
  try {
    const player = createAudioPlayer(restDoneSource);
    player.loop = false;
    return player;
  } catch {
    return null;
  }
}

function releasePlayer(player: AudioPlayer) {
  try {
    player.pause();
  } catch {
    // כבר שוחרר - מתעלמים
  }
  try {
    player.remove();
  } catch {
    // כבר שוחרר - מתעלמים
  }
}

export function useRestSounds() {
  // נגן מוכן שעוד לא ניגן (נוצר כשהמנוחה מתחילה, כדי שהצליל יתחיל מיד בסיומה)
  const primed = useRef<AudioPlayer | null>(null);
  const hasPlayedThisRest = useRef(false);

  useEffect(() => {
    ensureAudioMode();
    return () => {
      if (primed.current) {
        releasePlayer(primed.current);
        primed.current = null;
      }
    };
  }, []);

  // קוראים לזה בתחילת כל מנוחה
  const primeDone = useCallback(() => {
    hasPlayedThisRest.current = false;
    if (primed.current) return;
    primed.current = createDonePlayer();
  }, []);

  const playTick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const playDone = useCallback(() => {
    if (hasPlayedThisRest.current) return; // פעם אחת לכל מנוחה, בלי קשר לכמה פעמים קראו לנו
    hasPlayedThisRest.current = true;

    const player = primed.current ?? createDonePlayer();
    primed.current = null; // הנגן הזה חד־פעמי - לא משתמשים בו שוב לעולם
    if (!player) return;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(failsafe);
      sub.remove();
      releasePlayer(player);
    };
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) release();
    });
    const failsafe = setTimeout(release, RELEASE_FAILSAFE_MS);

    try {
      player.play();
    } catch {
      release();
    }
  }, []);

  return { playTick, playDone, primeDone };
}
