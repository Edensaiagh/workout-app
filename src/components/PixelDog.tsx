// src/components/PixelDog.tsx
//
// הכלבה מהלוגו, בשתי שכבות: הגוף (עם המשקולת) והזנב לבד, כדי שאפשר לקשקש בזנב
// בלי להזיז את שאר הגוף. שתי התמונות הן קנבס של 1024x1024, באותו מיקום ובאותו גודל
// כמו assets/splash-icon.png, ולכן כשהכלבה במנוחה היא נראית בדיוק כמו המסך הנייטיב.
//
// props:
//   size   - רוחב וגובה הקנבס ב-dp (הכלבה עצמה תופסת כ-70% מזה)
//   tail   - זווית הזנב במעלות (חיובי = עם כיוון השעון)
//   dy     - הזזה אנכית ב-dp (שלילי = למעלה), לקפיצות
//   scaleX / scaleY - כיווץ ומתיחה סביב כפות הרגליים, כדי לתת תחושת משקל בנחיתה

import React from 'react';
import { Image, View } from 'react-native';

const BODY = require('../../assets/anim/dog-body.png');
const TAIL = require('../../assets/anim/dog-tail.png');

const CANVAS = 1024;
// נקודת החיבור של הזנב לגוף וקו כפות הרגליים, בפיקסלים של הקנבס
const TAIL_PIVOT = { x: 248, y: 504 };
const FEET_Y = 871;

type Props = {
  size: number;
  tail?: number;
  dy?: number;
  scaleX?: number;
  scaleY?: number;
};

export default function PixelDog({ size, tail = 0, dy = 0, scaleX = 1, scaleY = 1 }: Props) {
  const k = size / CANVAS;
  const center = size / 2;
  const pivotX = TAIL_PIVOT.x * k - center;
  const pivotY = TAIL_PIVOT.y * k - center;
  const feetOffset = FEET_Y * k - center;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        // React Native מכווץ סביב מרכז התמונה, לכן מוסיפים הזזה כדי שהכפות יישארו על הרצפה
        transform: [{ translateY: dy + feetOffset * (1 - scaleY) }, { scaleX }, { scaleY }],
      }}
    >
      <Image source={BODY} fadeDuration={0} style={{ position: 'absolute', width: size, height: size }} />
      <Image
        source={TAIL}
        fadeDuration={0}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          // סיבוב סביב נקודת החיבור: מזיזים אליה, מסובבים, ומחזירים
          transform: [
            { translateX: pivotX },
            { translateY: pivotY },
            { rotate: `${tail}deg` },
            { translateX: -pivotX },
            { translateY: -pivotY },
          ],
        }}
      />
    </View>
  );
}
