import { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontAssets, fontSize, iconSize, spacing, touch } from './src/theme';
import WorkoutTrackerScreen from './src/screens/WorkoutTrackerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/lib/authContext';
import { syncPendingWorkoutsToCloud } from './src/lib/workoutService';

const Tab = createBottomTabNavigator();

// ערכת נושא של הניווט - כל הצבעים מגיעים מ-src/theme/colors.ts
const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    border: colors.line,
    primary: colors.accent,
    text: colors.text,
  },
};

function AppTabs() {
  // גובה הסרגל כולל את האזור הבטוח של המכשיר (סרגל הניווט/הבית של הטלפון)
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
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
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return user ? <AppTabs /> : <LoginScreen />;
}

export default function App() {
  // בזמן שהגופן נטען מציגים רק רקע כהה; אם הטעינה נכשלת ממשיכים עם גופן המערכת
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={AppTheme}>
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
