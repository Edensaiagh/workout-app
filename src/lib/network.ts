// src/lib/network.ts
// זיהוי חיבור לאינטרנט (expo-network), להצגת הודעת "אין חיבור" במסכים.
//
// בכוונה מניחים שיש חיבור כל עוד המצב לא ידוע (למשל ברגעים הראשונים אחרי פתיחת
// האפליקציה): הודעת "אין חיבור" שגויה גרועה יותר מאי-הצגה של הודעה לשנייה.

import { useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';

export type ConnectionStatus = 'online' | 'offline' | 'restored';

// כמה זמן ההודעה "החיבור חזר" נשארת על המסך לפני שהיא נעלמת
const RESTORED_VISIBLE_MS = 4000;

/** true רק כשבטוח שאין חיבור (אין רשת בכלל, או רשת בלי גישה לאינטרנט). */
export function useIsOffline(): boolean {
  const state = Network.useNetworkState();
  return state.isConnected === false || state.isInternetReachable === false;
}

/**
 * online - הכול רגיל, אין מה להציג.
 * offline - אין חיבור.
 * restored - החיבור חזר אחרי שהיה נתק; נשאר כך כמה שניות ואז חוזר ל-online.
 */
export function useConnectionStatus(): ConnectionStatus {
  const offline = useIsOffline();
  const wasOffline = useRef(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (offline) {
      wasOffline.current = true;
      setRestored(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setRestored(true);
      const timer = setTimeout(() => setRestored(false), RESTORED_VISIBLE_MS);
      return () => clearTimeout(timer);
    }
  }, [offline]);

  if (offline) return 'offline';
  return restored ? 'restored' : 'online';
}
