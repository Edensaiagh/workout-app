// src/theme/colors.ts
//
// מקור האמת היחיד לצבעים באפליקציה. אף מסך לא אמור לכתוב קוד צבע (#xxxxxx) בעצמו -
// רק לקבל אותם מ-useTheme() (ראה ThemeProvider.tsx). כדי לשנות צבע בכל האפליקציה,
// משנים אותו כאן בלבד.
//
// יש שתי פלטות עם אותם שמות בדיוק: כהה ובהירה. הבחירה ביניהן נעשית ב-ThemeProvider.
// accent = צבע למילוי (כפתורים); accentText = אותו כתום כשהוא משמש טקסט/אייקון/קו,
// כי הכתום הבהיר לא קריא על רקע בהיר.

export const darkColors = {
  // ---- רקעים ומשטחים (מהכהה לבהיר) ----
  bg: '#0f0f10', // רקע כל המסכים
  surface: '#17181c', // כרטיסים, סרגל ניווט תחתון
  surfaceRaised: '#1f2126', // כרטיס בתוך כרטיס, שדות קלט
  surfaceHigh: '#26282f', // צ'יפים, תגיות, כפתורים משניים

  // ---- קווים ומסגרות ----
  line: '#2c2c2e',
  lineStrong: '#3a3a3c',

  // ---- טקסט ----
  text: '#f1f0ec',
  textDim: '#9a9ca4',
  textFaint: '#64666f',

  // ---- צבע ראשי (כתום) ----
  accent: '#ffb454',
  accentText: '#ffb454', // כתום לטקסט, אייקונים וקווים
  accentSoft: 'rgba(255,180,84,0.12)', // רקע עדין מאחורי טקסט/אייקון בצבע accent
  accentDim: '#4a3510', // קצה כהה של גרדיאנט עמודות
  accentBadgeBg: '#2a2008',
  accentBadgeBorder: '#4a3a12',
  onAccent: '#141414', // טקסט/אייקון שיושב על רקע accent

  // ---- סטטוסים ----
  danger: '#e5636a',
  dangerBorder: 'rgba(229,99,106,0.4)',
  dangerBg: '#241416',
  dangerText: '#f0c2c5',
  success: '#34c759',
  warning: '#ff9f0a',
  // הודעות מצב (אין חיבור / החיבור חזר): רקע עדין ומסגרת באותו גוון
  warningSoft: 'rgba(255,159,10,0.12)',
  warningBorder: 'rgba(255,159,10,0.4)',
  successSoft: 'rgba(52,199,89,0.12)',
  successBorder: 'rgba(52,199,89,0.4)',

  // ---- מסך הניתוח: כחול לפעילות/עבודה, כתום למנוחה ----
  chartPrimary: '#5b8cff',
  chartPrimarySoft: 'rgba(91,140,255,0.12)',
  chartRest: '#ff9f0a',
  onChartPrimary: '#ffffff', // טקסט על עמודות chartPrimary

  // ---- צבעי משנה לנתונים (גרפים, נקודות) ----
  teal: '#5fd0c0', // סטים / מנוחה
  info: '#4a90d9', // שדה משקל

  // ---- כרטיס השיתוף (מצולם כתמונה, כהה קבוע) ----
  shareCardBg: '#141414',
  shareCardBorder: '#2a2a2a',

  // ---- שונות ----
  overlay: 'rgba(0,0,0,0.6)',
  white: '#ffffff',
} as const;

export type ColorName = keyof typeof darkColors;
export type Palette = { [K in ColorName]: string };

export const lightColors: Palette = {
  bg: '#ebe8e0',
  surface: '#f7f5ef',
  surfaceRaised: '#e2ded4',
  surfaceHigh: '#d6d1c5',

  line: '#cdc8bb',
  lineStrong: '#b9b4a6',

  text: '#121110',
  textDim: '#43444b',
  textFaint: '#7a7b82',

  accent: '#e8900c',
  accentText: '#8a4a00',
  accentSoft: 'rgba(217,130,0,0.12)',
  accentDim: '#e3c68a',
  accentBadgeBg: '#f6e3bb',
  accentBadgeBorder: '#dcbd7c',
  onAccent: '#141414',

  danger: '#d0454d',
  dangerBorder: 'rgba(208,69,77,0.5)',
  dangerBg: '#f1dbd8',
  dangerText: '#7a1d23',
  success: '#2fa04c',
  warning: '#c47600',
  warningSoft: 'rgba(196,118,0,0.12)',
  warningBorder: 'rgba(196,118,0,0.45)',
  successSoft: 'rgba(47,160,76,0.12)',
  successBorder: 'rgba(47,160,76,0.45)',

  chartPrimary: '#e0900a',
  chartPrimarySoft: 'rgba(224,144,10,0.16)',
  chartRest: '#4a76e0',
  onChartPrimary: '#141414', // בבהיר הצבע הראשי כתום, לכן טקסט כהה עליו

  teal: '#1c9484',
  info: '#3a78c2',

  // כרטיס השיתוף נשאר כהה בשני המראות - הוא מצולם כתמונה
  shareCardBg: '#141414',
  shareCardBorder: '#2a2a2a',

  overlay: 'rgba(0,0,0,0.5)',
  white: '#f7f5ef',
};
