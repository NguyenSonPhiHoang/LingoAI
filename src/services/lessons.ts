
"use client";

import { db } from "@/lib/firebase";
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
} from "firebase/firestore";
import type { LessonSuggestion } from "@/ai/flows/schemas";

const lessonsCollection = collection(db, "lessons");

// Can be extended with more specific exercise types
export type Exercise = any;

export interface LessonContent {
    id: string;
    type: 'conversation' | 'reading-passage' | 'grammar-explanation';
    value: string;
}

export interface Lesson extends LessonSuggestion {
  id: string;
  docId: string;
  userId: string;
  createdAt: any;
  content?: LessonContent[];
  exercises?: {
      reading?: Exercise;
      writing?: Exercise;
      listening?: Exercise;
      speaking?: Exercise;
  };
}

export const getLessons = async (userId: string): Promise<Lesson[]> => {
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
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      content: data.content || [],
      exercises: data.exercises || {},
    } as Lesson
  })
};

export const addLesson = async (userId: string, lessonSuggestion: LessonSuggestion): Promise<Lesson> => {
    const lessonData = {
        ...lessonSuggestion,
        userId,
        createdAt: Timestamp.now(),
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

export const updateLessonContent = async (docId: string, content: LessonContent[], exercises?: Lesson['exercises']) => {
    const lessonDoc = doc(db, "lessons", docId);
    const updates: Partial<Lesson> = { content };
    if (exercises) {
        updates.exercises = exercises;
    }
    await updateDoc(lessonDoc, updates);
}
