// src/theme/colors.ts
//
// מקור האמת היחיד לצבעים באפליקציה. אף מסך לא אמור לכתוב קוד צבע (#xxxxxx) בעצמו -
// רק לייבא מכאן. כדי לשנות צבע בכל האפליקציה, משנים אותו כאן בלבד.

export const colors = {
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
  success: '#5aa876',
  warning: '#d9a066',

  // ---- מסך הניתוח: כחול מעומעם לפעילות/עבודה, כתום מעומעם למנוחה ----
  chartPrimary: '#6b88c9',
  chartPrimarySoft: 'rgba(107,136,201,0.15)',
  chartRest: '#d9a066',

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

export type ColorName = keyof typeof colors;
