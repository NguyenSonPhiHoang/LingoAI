
"use client";

import { db } from "@/lib/firebase";
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
import { format } from 'date-fns';

const activityCollection = collection(db, "user_activity");

export interface DailyActivity {
    date: string; // YYYY-MM-DD
    durationSeconds: number;
}


// Records an incremental amount of active time for a user on a specific day.
export const recordActivity = async (userId: string, seconds: number) => {
  if (!userId || seconds <= 0) return;

  const today = format(new Date(), 'yyyy-MM-dd');
  const docId = `${userId}_${today}`;
  const activityDocRef = doc(activityCollection, docId);

  try {
    const docSnap = await getDoc(activityDocRef);

    if (docSnap.exists()) {
      // Document for today exists, just increment the duration
      await setDoc(activityDocRef, {
        durationSeconds: increment(seconds),
        lastActive: serverTimestamp(),
      }, { merge: true });
    } else {
      // No document for today, create a new one
      await setDoc(activityDocRef, {
        userId,
        date: Timestamp.fromDate(new Date(`${today}T00:00:00.000Z`)), // Store date as UTC timestamp
        durationSeconds: seconds,
        lastActive: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error recording user activity:", error);
  }
};

// Gets the total activity duration for a single user across all time.
export const getTotalUserActivity = async (userId: string): Promise<number> => {
    const q = query(activityCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    let totalSeconds = 0;
    querySnapshot.forEach((doc) => {
        totalSeconds += doc.data().durationSeconds || 0;
    });

    return totalSeconds;
}

// Gets the total activity for all users (for admin view)
export const getAllUsersTotalActivity = async (): Promise<Record<string, number>> => {
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
export const getUserActivityForMonth = async (userId: string, year: number, month: number): Promise<DailyActivity[]> => {
    // Create dates in UTC to avoid timezone issues.
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const q = query(
        activityCollection,
        where("userId", "==", userId),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<", Timestamp.fromDate(endDate)),
        orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            date: format((data.date as Timestamp).toDate(), 'yyyy-MM-dd'),
            durationSeconds: data.durationSeconds
        }
    });
};
