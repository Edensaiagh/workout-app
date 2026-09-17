// src/lib/sound.ts
// רטט בלבד למנוחה - הסאונד הוסר בגלל באג בניגון (ציפצופים שלא נפסקים).
// אם נרצה להחזיר צליל בעתיד, כדאי לבדוק את זה מול גרסת expo-audio לפני שילוב מחדש.

import * as Haptics from 'expo-haptics';

// שומרים על אותה חתימה (useRestSounds מחזיר playTick/playDone) כדי שלא
// יהיה צריך לגעת בקוד שקורא לפונקציות האלה במסך המעקב.
export function useRestSounds() {
  const playTick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const playDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return { playTick, playDone };
}