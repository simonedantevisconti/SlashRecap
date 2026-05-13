import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const PLAN_LIMITS = {
  free: {
    label: "Free",
    dailyLimit: 3,
    monthlyLimit: 30,
  },
  starter: {
    label: "Starter",
    dailyLimit: 40,
    monthlyLimit: 1200,
  },
  pro: {
    label: "Pro",
    dailyLimit: 100,
    monthlyLimit: 3000,
  },
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export async function ensureUserProfile(firebaseUser) {
  if (!firebaseUser) return null;

  const userRef = doc(db, "users", firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  }

  const todayKey = getTodayKey();
  const monthKey = getMonthKey();

  const payload = {
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "",
    photoURL: firebaseUser.photoURL || "",
    plan: "free",
    recapDailyCount: 0,
    recapMonthlyCount: 0,
    usageDay: todayKey,
    usageMonth: monthKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, payload);

  return {
    id: firebaseUser.uid,
    ...payload,
  };
}

export async function getUserProfile(userId) {
  if (!userId) {
    throw new Error("Utente non autenticato.");
  }

  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const profile = {
    id: snapshot.id,
    ...snapshot.data(),
  };

  return resetUsageIfNeeded(userId, profile);
}

export async function resetUsageIfNeeded(userId, profile) {
  const todayKey = getTodayKey();
  const monthKey = getMonthKey();

  const updates = {};
  const normalizedProfile = { ...profile };

  if (profile.usageDay !== todayKey) {
    updates.usageDay = todayKey;
    updates.recapDailyCount = 0;

    normalizedProfile.usageDay = todayKey;
    normalizedProfile.recapDailyCount = 0;
  }

  if (profile.usageMonth !== monthKey) {
    updates.usageMonth = monthKey;
    updates.recapMonthlyCount = 0;

    normalizedProfile.usageMonth = monthKey;
    normalizedProfile.recapMonthlyCount = 0;
  }

  if (Object.keys(updates).length > 0) {
    const userRef = doc(db, "users", userId);

    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  return normalizedProfile;
}

export async function canGenerateRecap(userId) {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      allowed: false,
      reason: "Profilo utente non trovato.",
      profile: null,
    };
  }

  const plan = profile.plan || "free";
  const limits = getPlanLimits(plan);

  const dailyCount = profile.recapDailyCount || 0;
  const monthlyCount = profile.recapMonthlyCount || 0;

  if (dailyCount >= limits.dailyLimit) {
    return {
      allowed: false,
      reason: `Hai raggiunto il limite giornaliero del piano ${limits.label}: ${limits.dailyLimit} recap.`,
      profile,
      limits,
    };
  }

  if (monthlyCount >= limits.monthlyLimit) {
    return {
      allowed: false,
      reason: `Hai raggiunto il limite mensile del piano ${limits.label}: ${limits.monthlyLimit} recap.`,
      profile,
      limits,
    };
  }

  return {
    allowed: true,
    reason: "",
    profile,
    limits,
  };
}

export async function incrementRecapUsage(userId) {
  if (!userId) {
    throw new Error("Utente non autenticato.");
  }

  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);

    if (!snapshot.exists()) {
      throw new Error("Profilo utente non trovato.");
    }

    const profile = snapshot.data();

    const todayKey = getTodayKey();
    const monthKey = getMonthKey();

    const shouldResetDay = profile.usageDay !== todayKey;
    const shouldResetMonth = profile.usageMonth !== monthKey;

    const currentDailyCount = shouldResetDay ? 0 : profile.recapDailyCount || 0;
    const currentMonthlyCount = shouldResetMonth
      ? 0
      : profile.recapMonthlyCount || 0;

    transaction.update(userRef, {
      usageDay: todayKey,
      usageMonth: monthKey,
      recapDailyCount: currentDailyCount + 1,
      recapMonthlyCount: currentMonthlyCount + 1,
      updatedAt: serverTimestamp(),
    });
  });
}
