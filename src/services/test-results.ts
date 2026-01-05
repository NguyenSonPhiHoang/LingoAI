"use client";

import { db, firebaseEnabled } from "@/lib/firebase";
import type { UserLevel } from "@/ai/flows/schemas";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";

const testResultsCollection = firebaseEnabled
  ? collection(db, "testResults")
  : (null as any);

export interface TestResult {
  id: string;
  userId: string;
  takenAt: any;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  recommendedLevel?: UserLevel;
  testType: "Placement Test" | "Review Test";
  durationSeconds?: number;
}

export interface NewTestResultPayload {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  recommendedLevel?: UserLevel;
  testType: "Placement Test" | "Review Test";
  durationSeconds?: number;
}

export const addTestResult = async (
  userId: string,
  result: NewTestResultPayload
) => {
  if (!firebaseEnabled) return;
  const payload = {
    ...result,
    userId,
    takenAt: Timestamp.now(),
  };
  await addDoc(testResultsCollection, payload);
};

export const getTestResults = async (userId: string): Promise<TestResult[]> => {
  if (!firebaseEnabled) return [];
  const q = query(
    testResultsCollection,
    where("userId", "==", userId),
    orderBy("takenAt", "desc")
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      takenAt:
        data.takenAt instanceof Timestamp
          ? data.takenAt.toDate()
          : data.takenAt,
    } as TestResult;
  });
};
