"use client";

import { db, firebaseEnabled } from "@/lib/firebase";
import type { UserLevel } from "@/ai/flows/schemas";
import { apiGet, apiPost } from "@/services/api";
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
  testType: "Placement Test" | "Review Test" | "Lesson Test" | "Practice";
  durationSeconds?: number;
  // Optional context to support lesson/practice linkage
  lessonId?: string;
  skill?: string;
}

export interface NewTestResultPayload {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  recommendedLevel?: UserLevel;
  testType: "Placement Test" | "Review Test" | "Lesson Test" | "Practice";
  durationSeconds?: number;
  lessonId?: string;
  skill?: string;
  // Additional details can be stored in backend JSON
  data?: any;
}

type SqlTestRow = {
  id: string;
  userId?: string | null;
  type?: string | null;
  data?: string | null;
  score?: number | null;
  createdAt?: string;

  contextType?: string | null;
  contextId?: string | null;
  skill?: string | null;
  totalQuestions?: number | null;
  correctAnswers?: number | null;
  durationSeconds?: number | null;
  clientCreatedAt?: string | null;
  completedAt?: string | null;
  version?: number | null;
};

const normalizeType = (testType: NewTestResultPayload["testType"]): string => {
  switch (testType) {
    case "Placement Test":
      return "placement";
    case "Review Test":
      return "review";
    case "Lesson Test":
      return "lesson";
    case "Practice":
      return "practice";
    default:
      return String(testType);
  }
};

const tryParseJson = (raw: string | null | undefined): any => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const addTestResult = async (
  userId: string,
  result: NewTestResultPayload
) => {
  if (!firebaseEnabled) {
    const type = normalizeType(result.testType);
    const payload = {
      ...result,
      userId,
      takenAt: new Date().toISOString(),
    };

    const contextType = result.lessonId ? "lesson" : null;
    const contextId = result.lessonId ?? null;
    const completedAt = payload.takenAt;
    const clientCreatedAt = payload.takenAt;

    const items = Array.isArray((result as any)?.data?.items)
      ? (result as any).data.items
      : null;

    // Store full payload in Data JSON, and put a numeric summary in Score.
    await apiPost("/api/tests", {
      type,
      score: typeof result.percentage === "number" ? result.percentage : null,
      data: payload,

      items,

      contextType,
      contextId,
      skill: result.skill ?? null,
      totalQuestions:
        typeof result.totalQuestions === "number"
          ? result.totalQuestions
          : null,
      correctAnswers:
        typeof result.correctAnswers === "number"
          ? result.correctAnswers
          : null,
      durationSeconds:
        typeof result.durationSeconds === "number"
          ? result.durationSeconds
          : null,
      clientCreatedAt,
      completedAt,
      version: 1,
    });
    return;
  }
  const payload = {
    ...result,
    userId,
    takenAt: Timestamp.now(),
  };
  await addDoc(testResultsCollection, payload);
};

export const getTestResults = async (userId: string): Promise<TestResult[]> => {
  if (!firebaseEnabled) {
    const rows = await apiGet<SqlTestRow[]>("/api/tests/me").catch(() => []);
    return (rows || [])
      .map((r) => {
        const parsed = tryParseJson(r.data) || {};
        const type = String(r.type || "").toLowerCase();

        const testType: TestResult["testType"] =
          type === "placement"
            ? "Placement Test"
            : type === "review"
            ? "Review Test"
            : type === "lesson"
            ? "Lesson Test"
            : "Practice";

        return {
          id: r.id,
          userId: String(r.userId || userId),
          takenAt: r.completedAt
            ? new Date(r.completedAt)
            : r.clientCreatedAt
            ? new Date(r.clientCreatedAt)
            : r.createdAt
            ? new Date(r.createdAt)
            : new Date(),
          correctAnswers: Number(
            (typeof r.correctAnswers === "number" ? r.correctAnswers : null) ??
              parsed.correctAnswers ??
              0
          ),
          totalQuestions: Number(
            (typeof r.totalQuestions === "number" ? r.totalQuestions : null) ??
              parsed.totalQuestions ??
              0
          ),
          percentage:
            typeof parsed.percentage === "number"
              ? parsed.percentage
              : typeof r.score === "number"
              ? r.score
              : 0,
          recommendedLevel: parsed.recommendedLevel,
          testType,
          durationSeconds:
            typeof r.durationSeconds === "number"
              ? r.durationSeconds
              : typeof parsed.durationSeconds === "number"
              ? parsed.durationSeconds
              : undefined,
          lessonId:
            typeof r.contextId === "string"
              ? r.contextId
              : typeof parsed.lessonId === "string"
              ? parsed.lessonId
              : undefined,
          skill:
            typeof r.skill === "string"
              ? r.skill
              : typeof parsed.skill === "string"
              ? parsed.skill
              : undefined,
        } as TestResult;
      })
      .sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt));
  }
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
