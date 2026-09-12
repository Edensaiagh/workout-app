// src/lib/firebase.ts
// חבר כאן את פרטי הפרויקט שלך מ-Firebase Console
// (Project settings -> General -> Your apps -> SDK setup and configuration)

import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAty9anUa6njM5H-iBG9o6tgg2Vj5tT6-0",
  authDomain: "bizi365-76610.firebaseapp.com",
  projectId: "bizi365-76610",
  storageBucket: "bizi365-76610.firebasestorage.app",
  messagingSenderId: "779775783240",
  appId: "1:779775783240:web:18e1280c7a0578aaa4837d",
  measurementId: "G-G40TRQ6PN8"
};

// מונע יצירת אפליקציה כפולה אם הקובץ נטען כמה פעמים (חם-reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// שימי לב: ב-React Native צריך persistence ידני עם AsyncStorage
// (אחרת המשתמש יתנתק בכל פתיחה מחדש של האפליקציה)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
