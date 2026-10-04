// src/lib/planService.ts
// אימונים שמורים (workoutPlans ב-Firestore) עם עותק מקומי ב-AsyncStorage.
// העותק המקומי משרת שני דברים: טעינה מיידית של הרשימה, ועבודה בלי אינטרנט.
// שינוי שנעשה בלי חיבור (או שנכשל) נשמר מקומית ומסומן "ממתין", ונשלח בפעם הבאה שיש חיבור.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { isDefinitelyOffline } from './network';
import type { WorkoutPlan } from '../types/plan';

const PLANS_COLLECTION = 'workoutPlans';
const CLOUD_TIMEOUT_MS = 8000;

interface PlansCache {
  plans: WorkoutPlan[];
  dirtyUpserts: string[]; // מזהי אימונים ששונו מקומית וטרם נשלחו
  dirtyDeletes: string[]; // מזהי אימונים שנמחקו מקומית וטרם נמחקו בענן
}

const cacheKey = (userId: string) => `workoutPlans:${userId}`;

async function readCache(userId: string): Promise<PlansCache> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (raw) return JSON.parse(raw) as PlansCache;
  } catch {
    // עותק מקומי פגום - מתחילים מחדש
  }
  return { plans: [], dirtyUpserts: [], dirtyDeletes: [] };
}

async function writeCache(userId: string, cache: PlansCache): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(cache));
  } catch {
    // כשל באחסון מקומי לא אמור להפיל את המסך
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

const sortPlans = (plans: WorkoutPlan[]) => [...plans].sort((a, b) => b.updatedAt - a.updatedAt);

/** הרשימה מהעותק המקומי בלבד - מיידית. */
export async function getCachedPlans(userId: string): Promise<WorkoutPlan[]> {
  return sortPlans((await readCache(userId)).plans);
}

// שולחת לענן את מה שממתין. מחזירה את המצב שנשאר ממתין.
async function flushDirty(userId: string, cache: PlansCache): Promise<PlansCache> {
  const upserts: string[] = [];
  for (const id of cache.dirtyUpserts) {
    const plan = cache.plans.find((p) => p.id === id);
    if (!plan) continue;
    try {
      await withTimeout(setDoc(doc(db, PLANS_COLLECTION, id), plan), CLOUD_TIMEOUT_MS);
    } catch {
      upserts.push(id);
    }
  }
  const deletes: string[] = [];
  for (const id of cache.dirtyDeletes) {
    try {
      await withTimeout(deleteDoc(doc(db, PLANS_COLLECTION, id)), CLOUD_TIMEOUT_MS);
    } catch {
      deletes.push(id);
    }
  }
  return { ...cache, dirtyUpserts: upserts, dirtyDeletes: deletes };
}

/** הרשימה המעודכנת: שולחת שינויים ממתינים, קוראת מהענן, ואם אין חיבור מחזירה את העותק המקומי. */
export async function listPlans(userId: string): Promise<WorkoutPlan[]> {
  let cache = await readCache(userId);
  if (await isDefinitelyOffline()) return sortPlans(cache.plans);

  try {
    cache = await flushDirty(userId, cache);
    const snap = await withTimeout(
      getDocs(query(collection(db, PLANS_COLLECTION), where('userId', '==', userId))),
      CLOUD_TIMEOUT_MS
    );
    const cloud = snap.docs.map((d) => d.data() as WorkoutPlan);
    // מה שעדיין ממתין לשליחה גובר על הענן (שינוי מקומי חדש יותר)
    const merged = cloud
      .filter((p) => !cache.dirtyDeletes.includes(p.id) && !cache.dirtyUpserts.includes(p.id))
      .concat(cache.plans.filter((p) => cache.dirtyUpserts.includes(p.id)));
    const next = { ...cache, plans: merged };
    await writeCache(userId, next);
    return sortPlans(merged);
  } catch {
    await writeCache(userId, cache);
    return sortPlans(cache.plans);
  }
}

/** שומרת (יצירה או עריכה). לא זורקת שגיאת רשת: במקרה של כשל נשמר מקומית ויישלח אחר כך. */
export async function savePlan(plan: WorkoutPlan): Promise<{ savedTo: 'cloud' | 'local' }> {
  const cache = await readCache(plan.userId);
  const plans = [...cache.plans.filter((p) => p.id !== plan.id), plan];
  const dirtyDeletes = cache.dirtyDeletes.filter((id) => id !== plan.id);
  let next: PlansCache = {
    plans,
    dirtyUpserts: Array.from(new Set([...cache.dirtyUpserts, plan.id])),
    dirtyDeletes,
  };
  await writeCache(plan.userId, next);

  if (await isDefinitelyOffline()) return { savedTo: 'local' };
  try {
    await withTimeout(setDoc(doc(db, PLANS_COLLECTION, plan.id), plan), CLOUD_TIMEOUT_MS);
    next = { ...next, dirtyUpserts: next.dirtyUpserts.filter((id) => id !== plan.id) };
    await writeCache(plan.userId, next);
    return { savedTo: 'cloud' };
  } catch {
    return { savedTo: 'local' };
  }
}

/** מוחקת אימון שמור. לא נוגעת באימונים שכבר בוצעו (workouts). */
export async function deletePlan(userId: string, planId: string): Promise<void> {
  const cache = await readCache(userId);
  let next: PlansCache = {
    plans: cache.plans.filter((p) => p.id !== planId),
    dirtyUpserts: cache.dirtyUpserts.filter((id) => id !== planId),
    dirtyDeletes: Array.from(new Set([...cache.dirtyDeletes, planId])),
  };
  await writeCache(userId, next);

  if (await isDefinitelyOffline()) return;
  try {
    await withTimeout(deleteDoc(doc(db, PLANS_COLLECTION, planId)), CLOUD_TIMEOUT_MS);
    next = { ...next, dirtyDeletes: next.dirtyDeletes.filter((id) => id !== planId) };
    await writeCache(userId, next);
  } catch {
    // יימחק בפעם הבאה שיש חיבור
  }
}
