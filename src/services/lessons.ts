
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

export interface Lesson extends LessonSuggestion {
  id: string;
  docId: string;
  userId: string;
  createdAt: any;
  // We can add content fields later, e.g., content: Array<{type: string, value: string}>
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
    } as Lesson
  })
};

export const addLesson = async (userId: string, lessonSuggestion: LessonSuggestion): Promise<Lesson> => {
    const lessonData = {
        ...lessonSuggestion,
        userId,
        createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(lessonsCollection, lessonData);
    
    return {
        ...lessonData,
        id: docRef.id,
        docId: docRef.id,
        createdAt: new Date(), // Convert for immediate client use
    };
};
