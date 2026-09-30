import { useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme, fontAssets, fontSize, iconSize, spacing, touch } from './src/theme';
import WorkoutTrackerScreen from './src/screens/WorkoutTrackerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/lib/authContext';
import { syncPendingWorkoutsToCloud } from './src/lib/workoutService';

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
  const { colors } = useTheme();
  const { user, initializing } = useAuth();

  // בעליית האפליקציה, אם יש משתמש מחובר, מנסים לסנכרן אימונים שנתקעו
  // מקומית מפעם קודמת שבה השמירה ל-Firestore נכשלה (ראה lib/localBackup.ts)
  useEffect(() => {
    if (!user) return;
    syncPendingWorkoutsToCloud().catch(() => {
      // כשל בסנכרון לא אמור להפריע לאף מסך - האימונים נשארים ממתינים לניסיון הבא
    });
  }, [user]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accentText} size="large" />
      </View>
    );
  }

  return user ? <AppTabs /> : <LoginScreen />;
}

function AppShell() {
  const { colors, scheme } = useTheme();

  // בזמן שהגופן נטען מציגים רק רקע; אם הטעינה נכשלת ממשיכים עם גופן המערכת
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
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
