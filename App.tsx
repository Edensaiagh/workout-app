import { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme, fontAssets, fontSize, iconSize, spacing, touch } from './src/theme';
import AnimatedSplash from './src/components/AnimatedSplash';
import LoadingScreen from './src/components/LoadingScreen';
import WorkoutTrackerScreen from './src/screens/WorkoutTrackerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/lib/authContext';
import { syncPendingWorkoutsToCloud } from './src/lib/workoutService';
import { useIsOffline } from './src/lib/network';

// המסך הנייטיב נשאר מוצג עד שהגופנים נטענים ו-AnimatedSplash מצויר, ואז AnimatedSplash מסתיר אותו
// (חייב לרוץ ברמת המודול, לפני שה-App מתרנדר).
SplashScreen.preventAutoHideAsync().catch(() => {
  // אם הקריאה נכשלת המסך הנייטיב פשוט ייעלם מוקדם יותר
});

const Tab = createBottomTabNavigator();

function AppTabs() {
  const { colors } = useTheme();
  // גובה הסרגל כולל את האזור הבטוח של המכשיר (סרגל הניווט/הבית של הטלפון)
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: touch.tabBar + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.xs,
        },
        tabBarLabelStyle: { fontSize: fontSize.sm, fontWeight: '600' },
        tabBarItemStyle: { minHeight: touch.min },
        tabBarIcon: ({ color }) => {
          const iconName =
            route.name === 'אימון'
              ? 'barbell'
              : route.name === 'היסטוריה'
              ? 'time'
              : route.name === 'ניתוח'
              ? 'stats-chart'
              : 'person-circle';
          return <Ionicons name={iconName as any} size={iconSize.tab} color={color} />;
        },
      })}
    >
      {/* TODO: אם תרצי שסדר הטאבים ירגיש RTL (אימון מימין, היסטוריה משמאל),
          תגידי לי - אפשר למרר את הסדר בלי להפעיל I18nManager.forceRTL גלובלי */}
      <Tab.Screen name="אימון" component={WorkoutTrackerScreen} />
      <Tab.Screen name="היסטוריה" component={HistoryScreen} />
      <Tab.Screen name="ניתוח" component={AnalysisScreen} />
      <Tab.Screen name="חשבון" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { user, initializing } = useAuth();
  const offline = useIsOffline();

  // בעליית האפליקציה, ובכל פעם שהחיבור חוזר אחרי נתק, אם יש משתמש מחובר, מנסים לסנכרן
  // אימונים שנתקעו מקומית כשהשמירה ל-Firestore נכשלה (ראה lib/localBackup.ts)
  useEffect(() => {
    if (!user || offline) return;
    syncPendingWorkoutsToCloud().catch(() => {
      // כשל בסנכרון לא אמור להפריע לאף מסך - האימונים נשארים ממתינים לניסיון הבא
    });
  }, [user, offline]);

  if (initializing) {
    return <LoadingScreen />;
  }

  return user ? <AppTabs /> : <LoginScreen />;
}

function AppShell() {
  const { colors, scheme } = useTheme();

  // מסך הפתיחה המונפש מוצג מעל האפליקציה עד שהוא מסיים לדעוך (ראה AnimatedSplash)
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  // בזמן שהגופנים נטענים המסך הנייטיב עדיין מוצג (preventAutoHideAsync למעלה), ולכן לא מציירים
  // כלום; אם הטעינה נכשלת ממשיכים עם גופן המערכת
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // ערכת נושא של הניווט - כל הצבעים מגיעים מ-src/theme/colors.ts
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.surface,
      border: colors.line,
      primary: colors.accentText,
      text: colors.text,
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <Root />
        </NavigationContainer>
      </AuthProvider>
      {!splashDone && <AnimatedSplash onFinish={handleSplashFinish} />}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
