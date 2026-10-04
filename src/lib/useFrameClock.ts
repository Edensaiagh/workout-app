// src/lib/useFrameClock.ts
//
// שעון לאנימציות פיקסלים: מחזיר את הזמן שעבר (בשניות) ומתעדכן ב-12 פריימים בשנייה,
// כדי שהתנועה תיראה "מדורגת" כמו בלוגו, ולא חלקה. כשמשתמשים בו הרכיב מצויר מחדש רק 12 פעמים
// בשנייה, וזה זול מספיק לרכיבים קטנים כמו הכלבה.
// useReduceMotion מחזיר true כשהמשתמש ביקש במכשיר להפחית אנימציות (נגישות).

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const FRAMES_PER_SECOND = 12;

export function useFrameClock(active: boolean = true): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 1000 / FRAMES_PER_SECOND);
    return () => clearInterval(id);
  }, [active]);

  return elapsed;
}

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduce(value);
      })
      .catch(() => {
        // אם אי אפשר לדעת, ממשיכים עם אנימציה רגילה
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}
