// src/lib/haptics.ts
//
// רטט קל לפעולות מרכזיות. כל הקריאות נבלעות בשקט אם המכשיר לא תומך (למשל web),
// כדי שרטט לא ישבור אף פעולה אמיתית.

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

function fire(run: () => Promise<void>) {
  try {
    run().catch(() => {});
  } catch {
    // אין תמיכה במכשיר הזה - מתעלמים
  }
}

export const haptics = {
  /** נגיעה קלה - הוספת סט, מעבר בין תרגילים */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** בחירה - לחיצה על + / − בטופס הסט */
  select: () => fire(() => Haptics.selectionAsync()),
  /** הצלחה - סיום מנוחה, סיום אימון, שיא חדש */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /**
   * סיום מנוחה - רטט חזק וארוך, כזה שמרגישים גם בכיס.
   * באנדרואיד: תבנית של שני פולסים בינוניים (המערכת מאפשרת שליטה באורך).
   * באייפון אי אפשר לשלוט באורך הרטט, אז מפעילים הצלחה + פולס בינוני אחד.
   */
  restDone: () => {
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate([0, 250, 120, 250]); // שני פולסים בינוניים
      } catch {
        // אין תמיכה - מתעלמים
      }
      return;
    }
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 250);
  },
  /** אזהרה - פעולה שנחסמה */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
