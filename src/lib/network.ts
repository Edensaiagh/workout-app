// src/lib/network.ts
// זיהוי חיבור לאינטרנט (expo-network), להצגת הודעת "אין חיבור" במסכים.
//
// בכוונה מניחים שיש חיבור כל עוד המצב לא ידוע (למשל ברגעים הראשונים אחרי פתיחת
// האפליקציה): הודעת "אין חיבור" שגויה גרועה יותר מאי-הצגה של הודעה לשנייה.

import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';

export type ConnectionStatus = 'online' | 'offline' | 'restored';

// כמה זמן ההודעה "החיבור חזר" נשארת על המסך לפני שהיא נעלמת
const RESTORED_VISIBLE_MS = 4000;

function reportsOffline(state: Network.NetworkState): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

// בדיקה אמיתית: האם אפשר להגיע לאינטרנט עכשיו. הדיווח של המערכת (expo-network)
// לפעמים נשאר "אין חיבור" גם אחרי שהחיבור חזר, ולכן הוא לא מספיק לבדו.
const PROBE_URL = 'https://clients3.google.com/generate_204';
const PROBE_TIMEOUT_MS = 4000;
const RECHECK_WHILE_OFFLINE_MS = 3000;

export async function canReachInternet(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(PROBE_URL, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
    return true; // כל תשובה מהשרת = יש אינטרנט
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** true רק כשבטוח שאין חיבור: המערכת מדווחת על ניתוק וגם בדיקה אמיתית נכשלה. */
export async function isDefinitelyOffline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!reportsOffline(state)) return false;
    return !(await canReachInternet());
  } catch {
    return false; // לא הצלחנו לבדוק - נניח שיש חיבור
  }
}

/** true רק כשבטוח שאין חיבור. כל עוד המערכת מדווחת על ניתוק, בודקים שוב כל כמה שניות. */
export function useIsOffline(): boolean {
  const state = Network.useNetworkState();
  const reported = reportsOffline(state);
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    if (!reported) {
      setReachable(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const ok = await canReachInternet();
      if (!cancelled) setReachable(ok);
    };
    check();
    const interval = setInterval(check, RECHECK_WHILE_OFFLINE_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [reported]);

  return reported && !reachable;
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
