// src/theme/metrics.ts
//
// גדלים קבועים לכל האפליקציה: רווחים, פינות, גדלי גופן וגדלי מגע.
// כל כפתור שאפשר ללחוץ עליו צריך להיות לפחות touch.min בגובה וברוחב.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
} as const;

export const touch = {
  min: 44, // גודל מגע מינימלי לכל לחצן (כולל כפתורי אייקון)
  button: 52, // כפתור רגיל / ראשי
  buttonLarge: 56, // כפתורים חשובים (סיום אימון, ניווט בין תרגילים)
  tabBar: 64, // גובה סרגל הניווט התחתון (בלי אזור בטוח של המכשיר)
} as const;

export const iconSize = {
  sm: 18,
  md: 22,
  lg: 28,
  tab: 28,
} as const;
