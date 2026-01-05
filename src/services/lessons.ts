"use client";

import { db, auth, firebaseEnabled } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import type { LessonSuggestion, UserLevel } from "@/ai/flows/schemas";

const lessonsCollection = firebaseEnabled
  ? collection(db, "lessons")
  : (null as any);

// Can be extended with more specific exercise types
export type Exercise = any;

export type LessonStatus = "not-started" | "in-progress" | "completed";

export interface LessonContent {
  id: string;
  type: "vocabulary" | "keyPoints" | "passage";
  value: string;
}

export interface Lesson extends LessonSuggestion {
  id: string;
  docId: string;
  userId: string;
  createdAt: any;
  level: UserLevel;
  status: LessonStatus;
  topicGroup: string; // The user-defined goal for grouping
  content?: LessonContent[];
  exercises?: {
    reading?: Exercise;
    writing?: Exercise;
    listening?: Exercise;
    speaking?: Exercise;
    pronunciation?: Exercise;
  };
}

// Helper function to recursively remove undefined properties from an object
const deepClean = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => deepClean(v)).filter((v) => v !== undefined);
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    return Object.fromEntries(
      Object.entries(obj)
        .map(([k, v]) => [k, deepClean(v)])
        .filter(([_, v]) => v !== undefined)
    );
  }
  return obj;
};

export const getLessons = async (userId: string): Promise<Lesson[]> => {
  if (!firebaseEnabled) return [];

  const q = query(
    lessonsCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      docId: doc.id,
      topic: data.topic,
      skill: data.skill,
      userId: data.userId,
      level: data.level,
      status: data.status || "not-started",
      topicGroup: data.topicGroup || "General",
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : data.createdAt,
      content: data.content || [],
      exercises: data.exercises || {},
    } as Lesson;
  });
};

export const addLesson = async (
  userId: string,
  lessonSuggestion: LessonSuggestion,
  topicGroup: string
): Promise<Lesson> => {
  if (!firebaseEnabled) {
    return {
      ...lessonSuggestion,
      userId,
      topicGroup,
      createdAt: new Date(),
      status: "not-started" as LessonStatus,
      content: [],
      exercises: {},
      id: `lesson_${Date.now()}`,
      docId: `lesson_${Date.now()}`,
    } as Lesson;
  }

  const lessonData = {
    ...lessonSuggestion,
    userId,
    topicGroup,
    createdAt: Timestamp.now(),
    status: "not-started" as LessonStatus,
    content: [],
    exercises: {},
  };
  const docRef = await addDoc(lessonsCollection, lessonData);

  return {
    ...lessonData,
    id: docRef.id,
    docId: docRef.id,
    createdAt: new Date(), // Convert for immediate client use
  };
};

export const updateLessonContent = async (
  docId: string,
  content: LessonContent[],
  exercises?: Lesson["exercises"]
) => {
  if (!firebaseEnabled) return;
  if (!auth.currentUser) return;
  const lessonDoc = doc(db, "lessons", docId);
  const updates: Partial<Lesson> = { content };
  if (exercises) {
    updates.exercises = deepClean(exercises);
  }
  await updateDoc(lessonDoc, updates);
};

export const updateLesson = async (
  docId: string,
  updates: Partial<Pick<Lesson, "topic" | "level" | "status">>
) => {
  if (!firebaseEnabled) return;
  if (!auth.currentUser) return;
  const lessonDoc = doc(db, "lessons", docId);
  await updateDoc(lessonDoc, updates);
};

export const deleteLesson = async (docId: string) => {
  if (!firebaseEnabled) return;
  if (!auth.currentUser) return;
  const lessonDoc = doc(db, "lessons", docId);
  await deleteDoc(lessonDoc);
};
