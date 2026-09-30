// src/theme/ThemeProvider.tsx
//
// מראה האפליקציה: כהה, בהיר, או "לפי המכשיר". הבחירה נשמרת על המכשיר.
// שימוש במסך:
//   const { colors, common } = useTheme();
//   const styles = useMemo(() => createStyles(colors), [colors]);
// כש-createStyles הוא `(colors: Palette) => StyleSheet.create({...})` בתחתית הקובץ.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, Palette } from './colors';
import { createCommon } from './common';

export type ThemeMode = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

const STORAGE_KEY = 'themeMode';

interface ThemeValue {
  colors: Palette;
  common: ReturnType<typeof createCommon>;
  scheme: Scheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const darkCommon = createCommon(darkColors);

const ThemeContext = createContext<ThemeValue>({
  colors: darkColors,
  common: darkCommon,
  scheme: 'dark',
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
      })
      .catch(() => {
        // אם הקריאה נכשלת נשארים על "לפי המכשיר"
      });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const scheme: Scheme = mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<ThemeValue>(() => {
    const colors = scheme === 'light' ? lightColors : darkColors;
    return { colors, common: createCommon(colors), scheme, mode, setMode };
  }, [scheme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
