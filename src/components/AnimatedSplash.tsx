// src/components/AnimatedSplash.tsx
//
// מסך הפתיחה המונפש. מוצג מעל האפליקציה מיד אחרי המסך הנייטיב של expo-splash-screen,
// והפריים הראשון שלו זהה לו (אותה כלבה, באותו גודל ובאותו מקום, על אותו רקע), כך שאין קפיצה במעבר.
// אחר כך: הכלבה קופצת, הזנב מקשקש, והכיתוב bizi365 נכתב אות אחר אות. בסוף המסך דוהה ומגלה
// את האפליקציה, שבינתיים כבר מתחילה להיטען מתחתיו (התחברות, סנכרון וכו').
//
// ציר הזמן (בשניות): 0-0.4 מנוחה | 0.4-1.4 קפיצה ונחיתה | 1.2-2.0 כתיבת הכיתוב | 3.0 דהייה.
// בהפחתת אנימציות (הגדרת נגישות במכשיר) מציגים פריים קבוע עם הכיתוב המלא ומסיימים מהר יותר.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import PixelDog from './PixelDog';
import { useFrameClock, useReduceMotion } from '../lib/useFrameClock';
import { splashColors, wordmarkFont } from '../theme';

// חייב להיות זהה ל-imageWidth של expo-splash-screen ב-app.json
const DOG_SIZE = 200;
const WORD = 'bizi365';
const WORD_ACCENT_FROM = 4; // "bizi" בלבן ו-"365" בכתום
const WORD_FONT_SIZE = 36;
const WORD_TOP_OFFSET = 88; // מרחק הכיתוב מתחת למרכז המסך

const WAG = [-6, 0, 6, 0];
const HOP = [0, -12, -24, -30, -24, -12];

const FINISH_AFTER_MS = 3000;
const FINISH_AFTER_MS_REDUCED = 1400;
const FADE_MS = 300;

type Props = {
  /** נקרא אחרי שהמסך דעך לגמרי, ואז אפשר להסיר אותו */
  onFinish: () => void;
};

export default function AnimatedSplash({ onFinish }: Props) {
  const reduceMotion = useReduceMotion();
  const clock = useFrameClock(!reduceMotion);
  // בהפחתת אנימציות: פריים קבוע אחרי הקפיצה, עם כל הכיתוב
  const t = reduceMotion ? 2.2 : clock;

  const opacity = useRef(new Animated.Value(1)).current;
  const [leaving, setLeaving] = useState(false);
  const [typedWidth, setTypedWidth] = useState(0);
  const nativeHidden = useRef(false);

  // מסתירים את המסך הנייטיב רק אחרי שהמסך המונפש צויר, כדי שלא יהיה רגע של מסך ריק
  const handleLayout = () => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {
        // אם ההסתרה נכשלת המסך הנייטיב נעלם ממילא כשהאפליקציה נסגרת/נפתחת מחדש
      });
    });
  };

  useEffect(() => {
    const id = setTimeout(() => setLeaving(true), reduceMotion ? FINISH_AFTER_MS_REDUCED : FINISH_AFTER_MS);
    return () => clearTimeout(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (!leaving) return;
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => onFinish());
  }, [leaving, opacity, onFinish]);

  // ---- הכלבה ----
  let dy = 0;
  let scaleX = 1;
  let scaleY = 1;
  const hopStep = Math.floor((t - 0.4) / 0.1);
  if (t >= 0.4 && hopStep < HOP.length) {
    dy = HOP[hopStep];
  } else if (t >= 1.0 && t < 1.2) {
    scaleX = 1.06; // נחיתה: מתכווצת קצת
    scaleY = 0.92;
  } else if (t >= 1.2 && t < 1.4) {
    scaleX = 0.98;
    scaleY = 1.03;
  }
  const tail = t < 0.3 ? 0 : WAG[Math.floor((t - 0.3) / 0.125) % 4];

  // ---- הכיתוב ----
  const chars = t < 1.2 ? 0 : Math.min(WORD.length, Math.floor((t - 1.2) / 0.12) + 1);
  const typed = WORD.slice(0, chars);
  const showCursor = chars > 0 && t < 2.8 && Math.floor(t / 0.4) % 2 === 0;
  const wordStyle = {
    fontFamily: wordmarkFont,
    fontSize: WORD_FONT_SIZE,
    color: splashColors.splashText,
    writingDirection: 'ltr' as const,
  };

  return (
    <Animated.View
      onLayout={handleLayout}
      accessibilityLabel="bizi365"
      style={[styles.root, { opacity }]}
    >
      {/* הרקע כהה בשני המראות, לכן סרגל המצב תמיד בהיר בזמן שהמסך מוצג */}
      <StatusBar style="light" />
      <PixelDog size={DOG_SIZE} dy={dy} tail={tail} scaleX={scaleX} scaleY={scaleY} />

      {/* direction: ltr - שהכיתוב והסמן יסתדרו משמאל לימין גם כשהאפליקציה כולה RTL */}
      <View style={styles.wordWrap} pointerEvents="none">
        <View style={{ direction: 'ltr' }}>
          {/* שכבה שקופה בגודל המלא של הכיתוב, כדי שהכיתוב לא יזוז תוך כדי כתיבה */}
          <Text style={[wordStyle, { opacity: 0 }]}>{WORD}</Text>
          {chars > 0 && (
            <Text
              style={[wordStyle, styles.typed]}
              onLayout={(e) => setTypedWidth(e.nativeEvent.layout.width)}
            >
              {typed.slice(0, WORD_ACCENT_FROM)}
              <Text style={{ color: splashColors.splashAccent }}>{typed.slice(WORD_ACCENT_FROM)}</Text>
            </Text>
          )}
          {showCursor && (
            <View
              style={[
                styles.cursor,
                { left: typedWidth + 4, height: WORD_FONT_SIZE * 0.8, backgroundColor: splashColors.splashAccent },
              ]}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    // ממלא את כל המסך; ב-React Native 0.86 הקבוע absoluteFillObject הוסר ונשאר רק absoluteFill
    ...StyleSheet.flatten(StyleSheet.absoluteFill),
    zIndex: 100,
    backgroundColor: splashColors.splashBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: WORD_TOP_OFFSET,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  typed: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  cursor: {
    position: 'absolute',
    top: WORD_FONT_SIZE * 0.1,
    width: 10,
  },
});
