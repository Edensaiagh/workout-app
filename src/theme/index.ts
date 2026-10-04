// src/theme/index.ts
// נקודת כניסה אחת לעיצוב: import { useTheme, spacing } from '../theme';

export { darkColors, lightColors, splashColors } from './colors';
export type { ColorName, Palette } from './colors';
export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeMode, Scheme } from './ThemeProvider';
export { spacing, radius, fontSize, touch, iconSize } from './metrics';
export { createCommon } from './common';
export { Text, TextInput } from './Text';
export { fontAssets, wordmarkFont } from './typography';
