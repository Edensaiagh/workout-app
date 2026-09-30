// src/constants/exerciseLibrary.ts
// ספריית התרגילים של האפליקציה. לכל תרגיל: שם בעברית, שם באנגלית (להצגה ולחיפוש בלבד),
// וקבוצת שרירים (לצ'יפים בבורר).
//
// חשוב: השם העברי הוא השם שנשמר באימון, והוא גם המפתח בהיסטוריה ובשיאים האישיים
// (personalRecords). לכן לא משנים שמות של תרגילים קיימים, רק מוסיפים חדשים.
//
// רק תרגילים עם משקל וחזרות נמצאים כאן. חימום אירובי ותרגילים ללא משקל (הליכון, אופני כושר,
// ברפי ועוד) ייכנסו בעתיד עם סוג מדידה נפרד. תרגילי עזרה שמורידים משקל (מתח בעזרת מכונה) לא נכנסו
// בכוונה, כי הם הופכים את משמעות המשקל ומבלבלים את מעקב השיאים.

export const MUSCLE_GROUPS = ['חזה', 'גב', 'כתפיים', 'ידיים', 'רגליים', 'ישבן', 'בטן'] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface LibraryExercise {
  name: string; // שם בעברית - נשמר באימון ומשמש כמפתח לשיאים
  en: string; // שם באנגלית - הצגה וחיפוש בלבד
  group: MuscleGroup;
}

type RawEntry = readonly [name: string, en: string];

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
    ['פולאובר עם משקולת', 'Dumbbell Pullover'],
  ],
  גב: [
    ['דדליפט', 'Deadlift'],
    ['משיכת מוט לחזה', 'Lat Pulldown'],
    ['משיכת מוט לחזה בהחזקה צרה', 'Close-Grip Lat Pulldown'],
    ['חתירה בכבל', 'Seated Cable Row'],
    ['חתירה עם מוט', 'Barbell Row'],
    ['חתירה עם משקולת יד', 'Dumbbell Row'],
    ['חתירה במכונה', 'Machine Row'],
    ['חתירה בשיפוע', 'T-Bar Row'],
    ['חתירה על ספסל בשיפוע', 'Chest-Supported Row'],
    ['מתח', 'Pull-Up'],
    ['מתח בהחזקה הפוכה', 'Chin-Up'],
    ['מתח בהחזקה רחבה', 'Wide-Grip Pull-Up'],
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
    ['תלתלי ריכוז', 'Concentration Curl'],
    ['פשיטת מרפק (טרייספס)', 'Triceps Extension'],
    ['פשיטת מרפק בכבל', 'Triceps Pushdown'],
    ['פשיטת מרפק מעל הראש', 'Overhead Triceps Extension'],
    ['פשיטת מרפק עם חבל', 'Rope Pushdown'],
    ['מקבילים לטרייספס', 'Triceps Dip'],
    ['קיק בק לטרייספס', 'Triceps Kickback'],
    ['כפיפת כף יד', 'Wrist Curl'],
    ['פשיטת כף יד', 'Reverse Wrist Curl'],
  ],
  רגליים: [
    ['סקוואט', 'Squat'],
    ['סקוואט קדמי', 'Front Squat'],
    ['סקוואט גביע', 'Goblet Squat'],
    ['סקוואט בולגרי', 'Bulgarian Split Squat'],
    ['סקוואט במכונת סמית', 'Smith Machine Squat'],
    ['לחיצת רגליים', 'Leg Press'],
    ['פשיטת ברך', 'Leg Extension'],
    ['כפיפת ברך', 'Leg Curl'],
    ['הרחקת רגל בישיבה', 'Seated Hip Abduction'],
    ['קירוב רגליים בישיבה', 'Seated Hip Adduction'],
    ['לאנג׳ (צעד סכין)', 'Lunge'],
    ['לאנג׳ הליכה', 'Walking Lunge'],
    ['לאנג׳ אחורי', 'Reverse Lunge'],
    ['לאנג׳ צידי', 'Lateral Lunge'],
    ['דדליפט רומני', 'Romanian Deadlift'],
    ['דדליפט רגליים ישרות', 'Stiff-Leg Deadlift'],
    ['עליית מדרגה', 'Step-Up'],
    ['הרמת עקבים בעמידה', 'Standing Calf Raise'],
    ['הרמת עקבים בישיבה', 'Seated Calf Raise'],
  ],
  ישבן: [
    ['הרמת אגן (היפ ת׳ראסט)', 'Hip Thrust'],
    ['הרמת אגן עם מוט', 'Barbell Hip Thrust'],
    ['הרמת אגן על ספסל', 'Bench Hip Thrust'],
    ['גשר ישבן', 'Glute Bridge'],
    ['גשר על רגל אחת', 'Single-Leg Glute Bridge'],
    ['בעיטת ישבן בכבל', 'Cable Glute Kickback'],
    ['בעיטה לאחור על ארבע', 'Donkey Kick'],
    ['הרחקת ירך בכבל', 'Cable Hip Abduction'],
    ['סווינג עם קטלבל', 'Kettlebell Swing'],
    ['סקוואט סומו', 'Sumo Squat'],
    ['דדליפט סומו', 'Sumo Deadlift'],
    ['עליית מדרגה גבוהה', 'High Step-Up'],
  ],
  בטן: [
    ['פלאנק', 'Plank'],
    ['פלאנק צידי', 'Side Plank'],
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
  RAW[group].map(([name, en]) => ({ name, en, group })),
);

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
