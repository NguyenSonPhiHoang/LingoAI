
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
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    // Manually construct the object to ensure correct structure
    // Only return a snippet of storyContent for the list view
    return {
      id: doc.id,
      userId: data.userId,
      level: data.level,
      format: data.format,
      title: data.title,
      keyVocabulary: [], // Don't load full vocabulary on list page
      storyContent: data.storyContent.substring(0, 150), // Return a snippet for preview
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
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
    
    return {
        id: docSnap.id,
        userId: data.userId,
        level: data.level,
        format: data.format,
        title: data.title,
        keyVocabulary: data.keyVocabulary || [],
        storyContent: data.storyContent,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
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
