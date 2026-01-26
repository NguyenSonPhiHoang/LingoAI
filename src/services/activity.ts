"use client";

import { db, firebaseEnabled } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { format } from "date-fns";
import { apiPost } from "./api";

const activityCollection = firebaseEnabled
  ? collection(db, "user_activity")
  : (null as any);

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  durationSeconds: number;
}

type SessionRecord = {
  id: string;
  userId: string;
  loginAt: number; // ms epoch
  logoutAt?: number | null; // ms epoch
};

const sessionStorageKey = (userId: string) => `lingoai_sessions_${userId}`;
const activeSessionIdKey = (userId: string) =>
  `lingoai_active_session_${userId}`;

const safeNow = () => Date.now();

const readSessions = (userId: string): SessionRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(sessionStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        id: String((s as any).id || ""),
        userId: String((s as any).userId || userId),
        loginAt: Number((s as any).loginAt || 0),
        logoutAt:
          (s as any).logoutAt === null || (s as any).logoutAt === undefined
            ? (s as any).logoutAt
            : Number((s as any).logoutAt),
      }))
      .filter(
        (s) =>
          !!s.id && !!s.userId && Number.isFinite(s.loginAt) && s.loginAt > 0,
      );
  } catch {
    return [];
  }
};

const writeSessions = (userId: string, sessions: SessionRecord[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(sessionStorageKey(userId), JSON.stringify(sessions));
  } catch {
    // ignore storage failures
  }
};

export const startUserSession = (userId: string) => {
  if (typeof window === "undefined") return;
  if (!userId) return;

  try {
    const existingId = sessionStorage.getItem(activeSessionIdKey(userId));
    if (existingId) {
      // If we already have an active session id for this tab, keep it.
      return;
    }

    const id = `${userId}_${safeNow()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const sessions = readSessions(userId);
    sessions.unshift({ id, userId, loginAt: safeNow(), logoutAt: null });
    writeSessions(userId, sessions);
    sessionStorage.setItem(activeSessionIdKey(userId), id);
  } catch {
    // ignore
  }
};

export const endUserSession = (userId: string) => {
  if (typeof window === "undefined") return;
  if (!userId) return;

  try {
    const id = sessionStorage.getItem(activeSessionIdKey(userId));
    if (!id) return;

    const now = safeNow();
    const sessions = readSessions(userId);
    const updated = sessions.map((s) =>
      s.id === id && (!s.logoutAt || s.logoutAt === null)
        ? { ...s, logoutAt: now }
        : s,
    );
    writeSessions(userId, updated);

    sessionStorage.removeItem(activeSessionIdKey(userId));
    // Try to POST the just-ended session to backend for persistence
    try {
      const updatedSession = updated.find((s) => s.id === id);
      if (updatedSession && updatedSession.logoutAt) {
        // send asynchronously (don't await)
        const payload = {
          // lessonId unknown on client; backend accepts null
          lessonId: null,
          startTime: new Date(updatedSession.loginAt).toISOString(),
          endTime: new Date(updatedSession.logoutAt).toISOString(),
          learningMode: null,
          accuracyRate: null,
          completed: false,
          ipAddress: null,
        };
        apiPost("/sessions", payload).catch(() => {
          // ignore network errors; data stays in localStorage for retry
        });
      }
    } catch (e) {
      // ignore
    }
  } catch {
    // ignore
  }
};

export const getTotalUserSessionSeconds = (userId: string): number => {
  if (typeof window === "undefined") return 0;
  if (!userId) return 0;

  const sessions = readSessions(userId);
  const now = safeNow();

  let totalMs = 0;
  for (const s of sessions) {
    const start = s.loginAt;
    const end =
      typeof s.logoutAt === "number" && s.logoutAt > 0 ? s.logoutAt : now;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      totalMs += end - start;
    }
  }

  return Math.floor(totalMs / 1000);
};

// Records an incremental amount of active time for a user on a specific day.
export const recordActivity = async (userId: string, seconds: number) => {
  if (!firebaseEnabled) return;
  if (!userId || seconds <= 0) return;

  const today = format(new Date(), "yyyy-MM-dd");
  const docId = `${userId}_${today}`;
  const activityDocRef = doc(activityCollection, docId);

  try {
    // This single command will create the document if it doesn't exist,
    // or update it if it does. This is more efficient and requires simpler security rules.
    await setDoc(
      activityDocRef,
      {
        userId,
        date: Timestamp.fromDate(new Date(`${today}T00:00:00.000Z`)), // Store date as UTC timestamp
        durationSeconds: increment(seconds),
        lastActive: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error recording user activity:", error);
  }
};

// Gets the total activity duration for a single user across all time.
export const getTotalUserActivity = async (userId: string): Promise<number> => {
  if (!firebaseEnabled) return 0;
  const q = query(activityCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  let totalSeconds = 0;
  querySnapshot.forEach((doc) => {
    totalSeconds += doc.data().durationSeconds || 0;
  });

  return totalSeconds;
};

// Gets the total activity for all users (for admin view)
export const getAllUsersTotalActivity = async (): Promise<
  Record<string, number>
> => {
  if (!firebaseEnabled) return {};
  const querySnapshot = await getDocs(activityCollection);
  const userTotals: Record<string, number> = {};

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const userId = data.userId;
    const duration = data.durationSeconds || 0;
    if (userId) {
      userTotals[userId] = (userTotals[userId] || 0) + duration;
    }
  });

  return userTotals;
};

// Gets a user's activity for a specific month and year.
export const getUserActivityForMonth = async (
  userId: string,
  year: number,
  month: number,
): Promise<DailyActivity[]> => {
  if (!firebaseEnabled) return [];
  // Create dates in UTC to avoid timezone issues.
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  const q = query(
    activityCollection,
    where("userId", "==", userId),
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<", Timestamp.fromDate(endDate)),
    orderBy("date", "asc"),
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      date: format((data.date as Timestamp).toDate(), "yyyy-MM-dd"),
      durationSeconds: data.durationSeconds,
    };
  });
};
