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
   * ספירה לאחור - פולס קצר אחד בכל אחת מ-3 השניות האחרונות של המנוחה.
   * באנדרואיד: 150ms. באייפון אי אפשר לשלוט באורך, אז נגיעה קלה.
   */
  restTick: () => {
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate([0, 150]);
      } catch {
        // אין תמיכה - מתעלמים
      }
      return;
    }
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /**
   * סיום מנוחה - שני פולסים קצרים.
   * באנדרואיד: 100ms, הפסקה 90ms, 100ms. באייפון אי אפשר לשלוט באורך, אז שתי נגיעות בינוניות.
   */
  restDone: () => {
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate([0, 100, 90, 100]);
      } catch {
        // אין תמיכה - מתעלמים
      }
      return;
    }
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    setTimeout(() => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 190);
  },
  /** אזהרה - פעולה שנחסמה */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
