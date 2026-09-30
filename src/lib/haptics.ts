// src/lib/haptics.ts
//
// רטט קל לפעולות מרכזיות. כל הקריאות נבלעות בשקט אם המכשיר לא תומך (למשל web),
// כדי שרטט לא ישבור אף פעולה אמיתית.

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
  /** אזהרה - פעולה שנחסמה */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
