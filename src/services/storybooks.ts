"use client";

import { db, auth, firebaseEnabled } from "@/lib/firebase";
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
  updateDoc,
} from "firebase/firestore";
import type {
  GenerateStorybookOutput,
  UserLevel,
  StorybookFormat,
} from "@/ai/flows/schemas";

const storybooksCollection = firebaseEnabled
  ? collection(db, "storybooks")
  : (null as any);

export type StorybookStatus = "not-started" | "in-progress" | "completed";

export interface Storybook extends GenerateStorybookOutput {
  id: string;
  userId: string;
  createdAt: any;
  level: UserLevel;
  format: StorybookFormat;
  status: StorybookStatus;
  titleAudioUrl?: string;
  englishContentAudioUrl?: string;
  vietnameseContentAudioUrl?: string;
}

export const getStorybooks = async (userId: string): Promise<Storybook[]> => {
  if (!firebaseEnabled) return [];

  const q = query(
    storybooksCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId || "",
      level: data.level || "beginner",
      format: data.format || "bilingual",
      title: data.title || "Untitled Story",
      status: data.status || "not-started",
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(0),
      // Intentionally omitting heavy fields for list view
    } as Storybook;
  });
};

export const getStorybook = async (id: string): Promise<Storybook | null> => {
  if (!firebaseEnabled) return null;

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
    userId: data.userId || "",
    level: data.level || "beginner",
    format: data.format || "bilingual",
    status: data.status || "not-started",
    title: data.title || "Untitled Story",
    keyVocabulary: data.keyVocabulary || [],
    englishStory: data.englishStory,
    vietnameseStory: data.vietnameseStory,
    interspersedStory: data.interspersedStory,
    fullEnglishStory: data.fullEnglishStory,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(0),
    titleAudioUrl: data.titleAudioUrl,
    englishContentAudioUrl: data.englishContentAudioUrl,
    vietnameseContentAudioUrl: data.vietnameseContentAudioUrl,
  } as Storybook;
};

export const addStorybook = async (
  userId: string,
  storyData: GenerateStorybookOutput,
  level: UserLevel,
  format: StorybookFormat
): Promise<Storybook> => {
  if (!firebaseEnabled) {
    return {
      ...(storyData as any),
      id: `storybook_${Date.now()}`,
      userId,
      level,
      format,
      status: "not-started",
      createdAt: new Date(),
    } as Storybook;
  }

  const plainStoryData = JSON.parse(JSON.stringify(storyData));

  const payload = {
    ...plainStoryData,
    userId,
    level,
    format,
    status: "not-started" as StorybookStatus,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(storybooksCollection, payload);
  return {
    ...payload,
    id: docRef.id,
    createdAt: new Date(),
  };
};

export const updateStorybook = async (
  id: string,
  updates: Partial<
    Pick<
      Storybook,
      | "titleAudioUrl"
      | "englishContentAudioUrl"
      | "vietnameseContentAudioUrl"
      | "status"
    >
  >
) => {
  if (!firebaseEnabled) return;
  const docRef = doc(db, "storybooks", id);
  const storybook = await getDoc(docRef);
  if (storybook.exists() && storybook.data().userId !== auth.currentUser?.uid) {
    throw new Error("Permission denied.");
  }
  await updateDoc(docRef, updates);
};

export const deleteStorybook = async (id: string): Promise<void> => {
  if (!firebaseEnabled) return;
  const docRef = doc(db, "storybooks", id);
  const storybook = await getDoc(docRef);
  if (storybook.exists() && storybook.data().userId !== auth.currentUser?.uid) {
    throw new Error("Permission denied.");
  }
  await deleteDoc(docRef);
};
