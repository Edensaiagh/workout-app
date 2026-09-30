// src/theme/typography.ts
//
// הגופן של האפליקציה (Heebo - תומך בעברית ובאנגלית). ב-React Native גופן מותאם אישית
// דורש שם גופן נפרד לכל משקל, לכן כאן ממופים משקלי fontWeight לשמות הגופנים.
// בפועל לא צריך לגעת בזה: הרכיבים Text ו-TextInput מ-'../theme' מיישמים את המיפוי לבד,
// ולכן בסגנונות ממשיכים לכתוב fontWeight: '700' כרגיל.
//
// ייבוא עמוק לכל משקל (ולא מאינדקס החבילה) כדי שרק 5 קבצי הגופן ייכנסו לאפליקציה.

import { Heebo_400Regular } from '@expo-google-fonts/heebo/400Regular';
import { Heebo_500Medium } from '@expo-google-fonts/heebo/500Medium';
import { Heebo_600SemiBold } from '@expo-google-fonts/heebo/600SemiBold';
import { Heebo_700Bold } from '@expo-google-fonts/heebo/700Bold';
import { Heebo_800ExtraBold } from '@expo-google-fonts/heebo/800ExtraBold';

/** מועבר ל-useFonts ב-App.tsx */
export const fontAssets = {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
};

/** שם הגופן לפי fontWeight שכתוב בסגנון */
export function fontFamilyForWeight(weight: string | number | undefined): string {
  switch (String(weight ?? '400')) {
    case '500':
      return 'Heebo_500Medium';
    case '600':
      return 'Heebo_600SemiBold';
    case '700':
    case 'bold':
      return 'Heebo_700Bold';
    case '800':
    case '900':
      return 'Heebo_800ExtraBold';
    default:
      return 'Heebo_400Regular'; // 100-400, normal
  }
}
