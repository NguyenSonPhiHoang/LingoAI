
"use client";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import type { GenerateStorybookOutput, UserLevel } from "@/ai/flows/schemas";

const storybooksCollection = collection(db, "storybooks");

export interface Storybook extends GenerateStorybookOutput {
  id: string;
  userId: string;
  createdAt: any;
  level: UserLevel;
  format: 'bilingual' | 'interspersed';
}

export const getStorybooks = async (userId: string): Promise<Storybook[]> => {
  const q = query(
    storybooksCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  
  // Map documents safely, providing default values for potentially missing fields.
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId || '',
      level: data.level || 'beginner',
      format: data.format || 'bilingual',
      title: data.title || 'Untitled Story',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0), // Default to epoch if invalid
      // Ensure complex fields default to empty values for the list view to prevent errors.
      keyVocabulary: [], 
      storyContent: '', 
    } as Storybook;
  });
};

export const getStorybook = async (id: string): Promise<Storybook | null> => {
    const docRef = doc(db, "storybooks", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }
    
    const data = docSnap.data();
    if (data.userId !== auth.currentUser?.uid) {
        throw new Error("Permission denied.");
    }
    
    // Safe mapping for the detail view
    return {
        id: docSnap.id,
        userId: data.userId || '',
        level: data.level || 'beginner',
        format: data.format || 'bilingual',
        title: data.title || 'Untitled Story',
        keyVocabulary: data.keyVocabulary || [],
        storyContent: data.storyContent || 'No content available.',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0),
    } as Storybook;
}

export const addStorybook = async (userId: string, storyData: GenerateStorybookOutput, level: UserLevel, format: 'bilingual' | 'interspersed'): Promise<Storybook> => {
    // Ensure data is a plain JavaScript object before sending to Firestore
    const plainStoryData = JSON.parse(JSON.stringify(storyData));

    const payload = {
        ...plainStoryData,
        userId,
        level,
        format,
        createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(storybooksCollection, payload);
    return {
        ...payload,
        id: docRef.id,
        createdAt: new Date(),
    };
};

export const deleteStorybook = async (id: string): Promise<void> => {
    const docRef = doc(db, "storybooks", id);
    const storybook = await getDoc(docRef);
    if (storybook.exists() && storybook.data().userId !== auth.currentUser?.uid) {
        throw new Error("Permission denied.");
    }
    await deleteDoc(docRef);
};
