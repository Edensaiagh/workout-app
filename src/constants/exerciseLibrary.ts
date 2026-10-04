// src/constants/exerciseLibrary.ts
// ספריית התרגילים של האפליקציה. לכל תרגיל: שם בעברית, שם באנגלית (להצגה ולחיפוש בלבד),
// וקבוצת שרירים (לצ'יפים בבורר).
//
// חשוב: השם העברי הוא השם שנשמר באימון, והוא גם המפתח בהיסטוריה ובשיאים האישיים
// (personalRecords). לכן לא משנים שמות של תרגילים קיימים, רק מוסיפים חדשים.
//
// רק תרגילים עם משקל וחזרות נמצאים כאן. חימום אירובי ותרגילים ללא משקל (הליכון, אופני כושר,
// ברפי ועוד) ייכנסו בעתיד עם סוג מדידה נפרד.
//
// סוגי תרגיל (ExerciseKind), נקבעים רק כאן, לפי השם:
//   regular    - משקל וחזרות (ברירת מחדל)
//   unilateral - דו-צדדי: סט אחד עם חזרות נפרדות לימין ולשמאל ומשקל משותף
//   assisted   - עם עזרה (מתח בעזרת מכונה): "המשקל" הוא העזרה, ופחות עזרה = תרגיל קשה יותר
// תרגיל שהוקלד חופשי (לא מהספרייה) הוא תמיד regular.
// להוספת סוג לתרגיל חדש: מוסיפים אותו כאיבר שלישי בשורה, למשל ['סקוואט בולגרי', 'Bulgarian Split Squat', 'unilateral'].

export const MUSCLE_GROUPS = ['חזה', 'גב', 'כתפיים', 'ידיים', 'רגליים', 'ישבן', 'בטן'] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type ExerciseKind = 'regular' | 'unilateral' | 'assisted';

export interface LibraryExercise {
  name: string; // שם בעברית - נשמר באימון ומשמש כמפתח לשיאים
  en: string; // שם באנגלית - הצגה וחיפוש בלבד
  group: MuscleGroup;
  kind: ExerciseKind;
}

type RawEntry = readonly [name: string, en: string, kind?: ExerciseKind];

const RAW: Record<MuscleGroup, RawEntry[]> = {
  חזה: [
    ['לחיצת חזה', 'Bench Press'],
    ['לחיצת חזה בשיפוע', 'Incline Bench Press'],
    ['לחיצת חזה בשיפוע שלילי', 'Decline Bench Press'],
    ['לחיצת חזה עם משקולות יד', 'Dumbbell Bench Press'],
    ['לחיצת חזה במכונה', 'Machine Chest Press'],
    ['לחיצת חזה בשיפוע עם משקולות יד', 'Incline Dumbbell Press'],
    ['לחיצת חזה צרה', 'Close-Grip Bench Press'],
    ['פליי לחזה', 'Chest Fly'],
    ['פליי בכבלים', 'Cable Crossover'],
    ['פליי במכונה', 'Pec Deck Fly'],
    ['שכיבות סמיכה', 'Push-Up'],
    ['שכיבות סמיכה בשיפוע', 'Incline Push-Up'],
    ['שכיבות סמיכה עם רגליים מוגבהות', 'Decline Push-Up'],
    ['שכיבות סמיכה על ברכיים', 'Knee Push-Up'],
    ['מקבילים לחזה', 'Chest Dip'],
    ['מקבילים בעזרת מכונה', 'Assisted Dip', 'assisted'],
    ['פולאובר עם משקולת', 'Dumbbell Pullover'],
  ],
  גב: [
    ['דדליפט', 'Deadlift'],
    ['משיכת מוט לחזה', 'Lat Pulldown'],
    ['משיכת מוט לחזה בהחזקה צרה', 'Close-Grip Lat Pulldown'],
    ['חתירה בכבל', 'Seated Cable Row'],
    ['חתירה עם מוט', 'Barbell Row'],
    ['חתירה עם משקולת יד', 'Dumbbell Row', 'unilateral'],
    ['חתירה במכונה', 'Machine Row'],
    ['חתירה בשיפוע', 'T-Bar Row'],
    ['חתירה על ספסל בשיפוע', 'Chest-Supported Row'],
    ['מתח', 'Pull-Up'],
    ['מתח בהחזקה הפוכה', 'Chin-Up'],
    ['מתח בהחזקה רחבה', 'Wide-Grip Pull-Up'],
    ['מתח בעזרת מכונה', 'Assisted Pull-Up', 'assisted'],
    ['מתח בהחזקה הפוכה בעזרת מכונה', 'Assisted Chin-Up', 'assisted'],
    ['משיכה ישרת ידיים בכבל', 'Straight-Arm Pulldown'],
    ['היפראקסטנשן', 'Back Extension'],
    ['גוד מורנינג', 'Good Morning'],
    ['קלין', 'Barbell Clean'],
  ],
  כתפיים: [
    ['לחיצת כתפיים', 'Shoulder Press'],
    ['לחיצת כתפיים עם משקולות יד', 'Dumbbell Shoulder Press'],
    ['לחיצת כתפיים במכונה', 'Machine Shoulder Press'],
    ['לחיצת ארנולד', 'Arnold Press'],
    ['לחיצת כתפיים עומדת', 'Standing Overhead Press'],
    ['הרחקת כתפיים לצד', 'Lateral Raise'],
    ['הרחקת כתפיים בכבל', 'Cable Lateral Raise'],
    ['הרמת כתפיים קדימה', 'Front Raise'],
    ['הרחקת כתף אחורית בהטיית גוף', 'Bent-Over Rear Delt Raise'],
    ['פייס פול', 'Face Pull'],
    ['פליי הפוך במכונה', 'Reverse Pec Deck'],
    ['הרמת כתפיים (שראגס)', 'Shrug'],
    ['שראגס עם משקולות יד', 'Dumbbell Shrug'],
    ['חתירה זקופה', 'Upright Row'],
    ['טורקיש גט אפ', 'Turkish Get-Up'],
    ['סנאץ', 'Snatch'],
  ],
  ידיים: [
    ['תלתלי יד', 'Biceps Curl'],
    ['תלתלי יד עם מוט', 'Barbell Curl'],
    ['תלתלי יד עם משקולות', 'Dumbbell Curl'],
    ['תלתלי פטיש', 'Hammer Curl'],
    ['תלתלי יד בכבל', 'Cable Curl'],
    ['תלתלי יד על ספסל מטיף', 'Preacher Curl'],
    ['תלתלי ריכוז', 'Concentration Curl', 'unilateral'],
    ['פשיטת מרפק (טרייספס)', 'Triceps Extension'],
    ['פשיטת מרפק בכבל', 'Triceps Pushdown'],
    ['פשיטת מרפק מעל הראש', 'Overhead Triceps Extension'],
    ['פשיטת מרפק עם חבל', 'Rope Pushdown'],
    ['מקבילים לטרייספס', 'Triceps Dip'],
    ['קיק בק לטרייספס', 'Triceps Kickback', 'unilateral'],
    ['כפיפת כף יד', 'Wrist Curl'],
    ['פשיטת כף יד', 'Reverse Wrist Curl'],
  ],
  רגליים: [
    ['סקוואט', 'Squat'],
    ['סקוואט קדמי', 'Front Squat'],
    ['סקוואט גביע', 'Goblet Squat'],
    ['סקוואט בולגרי', 'Bulgarian Split Squat', 'unilateral'],
    ['סקוואט במכונת סמית', 'Smith Machine Squat'],
    ['לחיצת רגליים', 'Leg Press'],
    ['פשיטת ברך', 'Leg Extension'],
    ['כפיפת ברך', 'Leg Curl'],
    ['הרחקת רגל בישיבה', 'Seated Hip Abduction'],
    ['קירוב רגליים בישיבה', 'Seated Hip Adduction'],
    ['לאנג׳ (צעד סכין)', 'Lunge', 'unilateral'],
    ['לאנג׳ הליכה', 'Walking Lunge', 'unilateral'],
    ['לאנג׳ אחורי', 'Reverse Lunge', 'unilateral'],
    ['לאנג׳ צידי', 'Lateral Lunge', 'unilateral'],
    ['דדליפט רומני', 'Romanian Deadlift'],
    ['דדליפט רגליים ישרות', 'Stiff-Leg Deadlift'],
    ['עליית מדרגה', 'Step-Up', 'unilateral'],
    ['הרמת עקבים בעמידה', 'Standing Calf Raise'],
    ['הרמת עקבים בישיבה', 'Seated Calf Raise'],
  ],
  ישבן: [
    ['הרמת אגן (היפ ת׳ראסט)', 'Hip Thrust'],
    ['הרמת אגן עם מוט', 'Barbell Hip Thrust'],
    ['הרמת אגן על ספסל', 'Bench Hip Thrust'],
    ['גשר ישבן', 'Glute Bridge'],
    ['גשר על רגל אחת', 'Single-Leg Glute Bridge', 'unilateral'],
    ['בעיטת ישבן בכבל', 'Cable Glute Kickback'],
    ['בעיטה לאחור על ארבע', 'Donkey Kick'],
    ['הרחקת ירך בכבל', 'Cable Hip Abduction'],
    ['סווינג עם קטלבל', 'Kettlebell Swing'],
    ['סקוואט סומו', 'Sumo Squat'],
    ['דדליפט סומו', 'Sumo Deadlift'],
    ['עליית מדרגה גבוהה', 'High Step-Up', 'unilateral'],
  ],
  בטן: [
    ['פלאנק', 'Plank'],
    ['פלאנק צידי', 'Side Plank', 'unilateral'],
    ['פלאנק עם נגיעת כתף', 'Plank Shoulder Tap'],
    ['כפיפות בטן', 'Crunch'],
    ['כפיפות בטן בכבל', 'Cable Crunch'],
    ['כפיפות בטן הפוכות', 'Reverse Crunch'],
    ['הרמות רגליים בשכיבה', 'Lying Leg Raise'],
    ['הרמות רגליים בתלייה', 'Hanging Leg Raise'],
    ['הרמות ברכיים בתלייה', 'Hanging Knee Raise'],
    ['גלגל בטן', 'Ab Wheel Rollout'],
    ['טוויסט רוסי', 'Russian Twist'],
    ['אופניים לבטן', 'Bicycle Crunch'],
    ['דד באג', 'Dead Bug'],
    ['בירד דוג', 'Bird Dog'],
    ['חיתוך עץ בכבל', 'Cable Wood Chop'],
  ],
};

export const EXERCISE_LIBRARY: LibraryExercise[] = MUSCLE_GROUPS.flatMap((group) =>
  RAW[group].map(([name, en, kind]) => ({ name, en, group, kind: kind ?? 'regular' })),
);

const KIND_BY_NAME: Record<string, ExerciseKind> = Object.fromEntries(
  EXERCISE_LIBRARY.map((e) => [e.name, e.kind]),
);

/** סוג התרגיל לפי שמו (אחרי trim). תרגיל שלא בספרייה הוא תמיד regular. */
export function getExerciseKind(name: string): ExerciseKind {
  return KIND_BY_NAME[name.trim()] ?? 'regular';
}

/** כל השמות העבריים - משמש את personalRecords כדי לדעת אילו תרגילים נספרים לשיאים. */
export const EXERCISE_NAMES: string[] = EXERCISE_LIBRARY.map((e) => e.name);

/** מפה משם עברי לשם באנגלית, להצגת ההיסטוריה האישית בבורר. */
export const EXERCISE_EN_BY_NAME: Record<string, string> = Object.fromEntries(
  EXERCISE_LIBRARY.map((e) => [e.name, e.en]),
);

/** כמות התרגילים בכל קבוצה, להצגה בצ'יפים. */
export const EXERCISE_COUNT_BY_GROUP: Record<MuscleGroup, number> = MUSCLE_GROUPS.reduce(
  (acc, group) => ({ ...acc, [group]: RAW[group].length }),
  {} as Record<MuscleGroup, number>,
);
