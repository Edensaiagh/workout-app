// src/lib/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from './firebase';

export function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

let googleConfigured = false;

// חשוב: @react-native-google-signin/google-signin הוא מודול native טהור -
// אם נטען אותו למעלה עם import רגיל, האפליקציה כולה תקרוס בפתיחה כשרצים
// דרך Expo Go (אין שם מודול native כזה). לכן טוענים אותו רק ברגע שבאמת
// לוחצים על "המשך עם Google", עם require() בתוך הפונקציה - כך שרק הכניסה
// עם Google תיכשל בצורה מבוקרת בזמן שהאפליקציה עצמה תמשיך לעבוד כרגיל.
//
// TODO: להחליף ב-Web client ID האמיתי מ-Firebase Console
// (Authentication -> Sign-in method -> Google -> Web SDK configuration -> Web client ID).
// כניסה עם Google תעבוד בפועל רק אחרי מעבר ל-development build
// (npx expo prebuild + eas build) והגדרת OAuth client + SHA-1 באנדרואיד ב-Google Cloud/Firebase.
const GOOGLE_WEB_CLIENT_ID = 'REPLACE_WITH_FIREBASE_WEB_CLIENT_ID';

export async function signInWithGoogle() {
  let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ GoogleSignin } = require('@react-native-google-signin/google-signin'));
  } catch {
    throw new Error(
      'כניסה עם Google עדיין לא זמינה בגרסה הזו של האפליקציה (דורש development build במקום Expo Go).'
    );
  }

  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    googleConfigured = true;
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success' || !response.data.idToken) {
    throw new Error('התחברות עם Google בוטלה');
  }
  const credential = GoogleAuthProvider.credential(response.data.idToken);
  return signInWithCredential(auth, credential);
}

export function logOut() {
  return signOut(auth);
}

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'כתובת האימייל לא תקינה';
    case 'auth/missing-password':
      return 'יש להזין סיסמה';
    case 'auth/weak-password':
      return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    case 'auth/email-already-in-use':
      return 'כבר קיים חשבון עם האימייל הזה - נסי להתחבר במקום';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'אימייל או סיסמה שגויים';
    case 'auth/too-many-requests':
      return 'יותר מדי נסיונות - נסי שוב בעוד כמה דקות';
    default:
      return 'משהו השתבש, נסי שוב';
  }
}
