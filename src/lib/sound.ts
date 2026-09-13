// src/lib/sound.ts
// ציפצוף + רטט למנוחה - שני הערוצים יחד כדי שהמתאמן ישים לב גם בחדר כושר רועש
// (הצליל דרך expo-audio, הרטט דרך expo-haptics)

import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const tickSound = require('../../assets/sounds/rest-tick.wav');
const doneSound = require('../../assets/sounds/rest-done.wav');

// Hook שמכין את שני הנגנים מראש (טעינה מוקדמת, כדי שלא יהיה עיכוב
// כשקוראים play() בפועל תוך כדי הספירה לאחור).
export function useRestSounds() {
  const tickPlayer = useAudioPlayer(tickSound);
  const donePlayer = useAudioPlayer(doneSound);

  // מחזירים כל נגן לתחילת הקובץ ברגע שהוא *באמת* סיים לנגן (didJustFinish),
  // לא לפני הניגון הבא. קודם היה seekTo(0) סינכרוני לפני כל play() - נסיעת
  // הלוך-ושוב נוספת דרך ה-bridge בדיוק ברגע שהצליל צריך להתחיל מיידית כדי
  // להישאר מסונכרן עם המספר על המסך. זה היה מקור הדיליי בין הצליל למספר.
  useEffect(() => {
    const sub = tickPlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        try {
          tickPlayer.seekTo(0);
        } catch {
          // ---
        }
      }
    });
    return () => sub.remove();
  }, [tickPlayer]);

  useEffect(() => {
    const sub = donePlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        try {
          donePlayer.seekTo(0);
        } catch {
          // ---
        }
      }
    });
    return () => sub.remove();
  }, [donePlayer]);

  const playTick = () => {
    try {
      tickPlayer.play();
    } catch {
      // אם הצליל נכשל מסיבה כלשהי (למשל מצב שקט), לא מפילים את האפליקציה
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const playDone = () => {
    try {
      donePlayer.play();
    } catch {
      // ---
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return { playTick, playDone };
}
