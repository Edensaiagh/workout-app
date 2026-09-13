import { I18nManager } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// חייב לרוץ לפני שה-App בכלל מתחיל להירנדר, אחרת התצוגה נשארת LTR.
// שינוי בדגלים האלה לא נכנס לתוקף מיידית - צריך Restart מלא של האפליקציה
// (לא Reload/Fast Refresh) כדי שה-native side יקרא את הכיוון החדש.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
