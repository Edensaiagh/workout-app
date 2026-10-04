// src/components/LoadingScreen.tsx
//
// מסך הטעינה: הכלבה מקפצת קלות ומקשקשת בזנב, ומתחתיה פס התקדמות של 8 ריבועים שמתמלא שוב ושוב.
// הפס לא מייצג התקדמות אמיתית (אין לנו אחוזי טעינה), הוא רק מראה שהאפליקציה עובדת.
// מוצג בזמן שמתברר אם יש משתמש מחובר (ראה Root ב-App.tsx).
// הצבעים מגיעים מערכת הנושא, ולכן המסך עובד גם במראה בהיר וגם בכהה.

import React from 'react';
import { View } from 'react-native';

import PixelDog from './PixelDog';
import { useFrameClock, useReduceMotion } from '../lib/useFrameClock';
import { spacing, useTheme } from '../theme';

const DOG_SIZE = 170;
const BLOCKS = 8;
const WAG = [-6, 0, 6, 0];

export default function LoadingScreen() {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const t = useFrameClock(!reduceMotion);

  // בהפחתת אנימציות מציגים מצב קבוע: כלבה במנוחה ופס חצי מלא
  const bounce = reduceMotion ? 0 : Math.floor(t / 0.25) % 2 === 1 ? -5 : 0;
  const tail = reduceMotion ? 0 : WAG[Math.floor(t / 0.125) % 4];
  // 0..8 ריבועים מלאים, ואז הפסקה קצרה של שני פריימים עם פס מלא לפני שמתחילים מחדש
  const filled = reduceMotion ? BLOCKS / 2 : Math.min(BLOCKS, Math.floor(t / 0.3) % (BLOCKS + 3));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="טוען"
      style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <PixelDog size={DOG_SIZE} dy={bounce} tail={tail} />
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg }}>
        {Array.from({ length: BLOCKS }, (_, i) => (
          <View
            key={i}
            style={{
              width: 14,
              height: 10,
              backgroundColor: i < filled ? colors.accent : colors.surfaceHigh,
            }}
          />
        ))}
      </View>
    </View>
  );
}
