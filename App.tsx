import { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import WorkoutTrackerScreen from './src/screens/WorkoutTrackerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/lib/authContext';
import { syncPendingWorkoutsToCloud } from './src/lib/workoutService';

const Tab = createBottomTabNavigator();

// ערכת נושא כהה שתואמת לצבעים ששימשו במסכים עצמם (0f0f10 / 17181c)
const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f0f10',
    card: '#17181c',
    border: '#2c2c2e',
    primary: '#ffb454',
    text: '#f1f0ec',
  },
};

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffb454',
        tabBarInactiveTintColor: '#64666f',
        tabBarStyle: {
          backgroundColor: '#17181c',
          borderTopColor: '#2c2c2e',
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'אימון' ? 'barbell' : route.name === 'היסטוריה' ? 'time' : 'person-circle';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      {/* TODO: אם תרצי שסדר הטאבים ירגיש RTL (אימון מימין, היסטוריה משמאל),
          תגידי לי - אפשר למרר את הסדר בלי להפעיל I18nManager.forceRTL גלובלי */}
      <Tab.Screen name="אימון" component={WorkoutTrackerScreen} />
      <Tab.Screen name="היסטוריה" component={HistoryScreen} />
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
      <View style={{ flex: 1, backgroundColor: '#0f0f10', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#ffb454" size="large" />
      </View>
    );
  }

  return user ? <AppTabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={AppTheme}>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}
