// src/lib/sound.ts
// ציפצוף + רטט למנוחה - שני הערוצים יחד כדי שהמתאמן ישים לב גם בחדר כושר רועש
// (הצליל דרך expo-audio, הרטט דרך expo-haptics)

import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';


const tickSound = require('../../assets/sounds/rest-tick.wav');
const doneSound = require('../../assets/sounds/rest-done.wav');

// Hook שמכין את שני הנגנים מראש (טעינה מוקדמת, כדי שלא יהיה עיכוב
// כשקוראים play() בפועל תוך כדי הספירה לאחור).
export function useRestSounds() {
  const tickPlayer = useAudioPlayer(tickSound);
  const donePlayer = useAudioPlayer(doneSound);

  const playTick = () => {
    try {
      tickPlayer.seekTo(0);
      tickPlayer.play();
    } catch {
      // אם הצליל נכשל מסיבה כלשהי (למשל מצב שקט), לא מפילים את האפליקציה
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const playDone = () => {
    try {
      donePlayer.seekTo(0);
      donePlayer.play();
    } catch {
      // ---
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return { playTick, playDone };
}
