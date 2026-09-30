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

  // ---- מסך הניתוח: כחול לפעילות/עבודה, כתום למנוחה ----
  chartPrimary: '#5b8cff',
  chartPrimarySoft: 'rgba(91,140,255,0.12)',
  chartRest: '#ff9f0a',

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
  bg: '#f6f5f1',
  surface: '#ffffff',
  surfaceRaised: '#efece5',
  surfaceHigh: '#e4e1d8',

  line: '#dcd8ce',
  lineStrong: '#c9c5b9',

  text: '#121110',
  textDim: '#43444b',
  textFaint: '#7a7b82',

  accent: '#ffb454',
  accentText: '#8a4a00',
  accentSoft: 'rgba(217,130,0,0.12)',
  accentDim: '#f1d59f',
  accentBadgeBg: '#fff0d2',
  accentBadgeBorder: '#eccf94',
  onAccent: '#141414',

  danger: '#c9363f',
  dangerBorder: 'rgba(201,54,63,0.45)',
  dangerBg: '#fdeceb',
  dangerText: '#7a1d23',
  success: '#1f9a3d',
  warning: '#b26a00',

  chartPrimary: '#3f6fe0',
  chartPrimarySoft: 'rgba(63,111,224,0.12)',
  chartRest: '#c77700',

  teal: '#0f7f70',
  info: '#2f6fb5',

  // כרטיס השיתוף נשאר כהה בשני המראות - הוא מצולם כתמונה
  shareCardBg: '#141414',
  shareCardBorder: '#2a2a2a',

  overlay: 'rgba(0,0,0,0.5)',
  white: '#ffffff',
};
