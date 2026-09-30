// src/theme/common.ts
//
// סגנונות שחוזרים ביותר ממסך אחד: מסך, כרטיס, כפתורים, כפתור חזור, כפתורי אייקון.
// מסך שצריך משהו מיוחד יוסיף רק את ההפרש שלו על גבי הסגנונות האלה.
//
// חשוב - כיווניות (RTL):
// האפליקציה רצה עם I18nManager.forceRTL(true) (ראה index.ts), כלומר flexDirection: 'row'
// כבר מסדר את הילדים מימין לשמאל. לכן:
//   - לא משתמשים ב-'row-reverse' (זה מחזיר את הסדר ל-LTR).
//   - לא כותבים textAlign: 'left' / 'right' - משאירים את ברירת המחדל, שמיישרת לפי השפה.
//     'center' תקין.
//   - לרווחים בצד משתמשים ב-marginStart/marginEnd/paddingStart/paddingEnd, לא left/right.

import { StyleSheet } from 'react-native';
import type { Palette } from './colors';
import { fontSize, radius, spacing, touch } from './metrics';

export const createCommon = (colors: Palette) => StyleSheet.create({
  // ---- מסכים וכרטיסים ----
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  // ---- כפתור ראשי (כתום, מלא) ----
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: touch.button,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },

  // ---- כפתור משני (מסגרת) ----
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    minHeight: touch.button,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600', fontSize: fontSize.md },

  // ---- כפתור הרסני (מסגרת אדומה) - סיום אימון, התנתקות ----
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    minHeight: touch.buttonLarge,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.md },

  // ---- כפתור אייקון מרובע (✕ למחיקה, חצים) ----
  iconButton: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDanger: { borderColor: colors.dangerBorder },
  iconButtonText: { color: colors.textDim, fontSize: fontSize.lg, fontWeight: '700' },
  iconButtonTextDanger: { color: colors.danger },

  // ---- כפתור "חזרה" בראש מסך פירוט ----
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touch.min,
    paddingEnd: spacing.md,
  },
  backButtonText: { color: colors.text, fontSize: fontSize.md + 1, fontWeight: '700' },

  // ---- כותרת מסך (היסטוריה, ניתוח) ----
  pageTitle: { color: colors.text, fontSize: fontSize.xxl - 2, fontWeight: '800' },
  pageSubtitle: { color: colors.textDim, fontSize: fontSize.sm, marginTop: 2 },

  // ---- מצב מבוטל ----
  disabled: { opacity: 0.4 },
});
