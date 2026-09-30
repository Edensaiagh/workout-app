// src/theme/Text.tsx
//
// Text ו-TextInput של האפליקציה: זהים לאלה של React Native, רק שמחילים עליהם את הגופן
// לפי ה-fontWeight שבסגנון. בכל המסכים מייבאים אותם מ-'../theme' ולא מ-'react-native'.

import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
} from 'react-native';
import { fontFamilyForWeight } from './typography';

function withFont(style: TextProps['style']) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  // fontWeight חוזר ל-normal, אחרת אנדרואיד מוסיף "הדגשה מלאכותית" מעל גופן שכבר מודגש
  return [style, { fontFamily: fontFamilyForWeight(weight), fontWeight: 'normal' as const }];
}

export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={withFont(style)} />;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { style, ...rest },
  ref,
) {
  return <RNTextInput ref={ref} {...rest} style={withFont(style)} />;
});
