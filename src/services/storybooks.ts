"use client";

import { db, auth, firebaseEnabled } from "@/lib/firebase";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
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
  if (!firebaseEnabled) {
    const rows = await apiGet<any[]>(`/api/storybooks/me`);
    return (rows || []).map((r) => ({
      id: r.id,
      userId: r.userId || userId || "",
      level: (r.level || "beginner") as UserLevel,
      format: (r.format || "bilingual") as StorybookFormat,
      title: r.title || "Untitled Story",
      status: (r.status || "not-started") as StorybookStatus,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(0),
      // List view intentionally omits heavy fields
    })) as Storybook[];
  }

  const q = query(
    storybooksCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, any>;
    return {
      id: doc.id,
      userId: typeof data.userId === "string" ? data.userId : "",
      level: (data.level || "beginner") as UserLevel,
      format: (data.format || "bilingual") as StorybookFormat,
      title: typeof data.title === "string" ? data.title : "Untitled Story",
      status: (data.status || "not-started") as StorybookStatus,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(0),
      // Intentionally omitting heavy fields for list view
    } as Storybook;
  });
};

export const getStorybooksByLessonId = async (
  userId: string,
  lessonId: string,
): Promise<Storybook[]> => {
  if (!lessonId) return [];

  if (!firebaseEnabled) {
    const rows = await apiGet<any[]>(
      `/api/storybooks/me/by-lesson/${encodeURIComponent(lessonId)}`,
    );
    return (rows || []).map((r) => ({
      id: r.id,
      userId: r.userId || userId || "",
      level: (r.level || "beginner") as UserLevel,
      format: (r.format || "bilingual") as StorybookFormat,
      title: r.title || "Untitled Story",
      status: (r.status || "not-started") as StorybookStatus,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(0),
    })) as Storybook[];
  }

  // Firebase mode doesn't store lesson↔storybook links.
  return [];
};

export const getStorybook = async (id: string): Promise<Storybook | null> => {
  if (!firebaseEnabled) {
    const r = await apiGet<any>(`/api/storybooks/me/${id}`);
    if (!r) return null;

    return {
      id: r.id,
      userId: r.userId || "",
      level: (r.level || "beginner") as UserLevel,
      format: (r.format || "bilingual") as StorybookFormat,
      status: (r.status || "not-started") as StorybookStatus,
      title: r.title || "Untitled Story",
      keyVocabulary: r.keyVocabulary || [],
      englishStory: r.englishStory,
      vietnameseStory: r.vietnameseStory,
      interspersedStory: r.interspersedStory,
      fullEnglishStory: r.fullEnglishStory,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(0),
      titleAudioUrl: r.titleAudioUrl || undefined,
      englishContentAudioUrl: r.englishContentAudioUrl || undefined,
      vietnameseContentAudioUrl: r.vietnameseContentAudioUrl || undefined,
    } as Storybook;
  }

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
  format: StorybookFormat,
  lessonId?: string,
): Promise<Storybook> => {
  if (!firebaseEnabled) {
    const payload = {
      ...(storyData as any),
      level,
      format,
      status: "not-started" as StorybookStatus,
      lessonId:
        typeof lessonId === "string" && lessonId.trim()
          ? lessonId.trim()
          : undefined,
    };

    const r = await apiPost<any>(`/api/storybooks`, payload);
    return {
      id: r.id,
      userId: r.userId || userId || "",
      level: (r.level || level) as UserLevel,
      format: (r.format || format) as StorybookFormat,
      status: (r.status || "not-started") as StorybookStatus,
      title: r.title || (storyData as any).title || "Untitled Story",
      keyVocabulary: r.keyVocabulary || (storyData as any).keyVocabulary || [],
      englishStory: r.englishStory ?? (storyData as any).englishStory,
      vietnameseStory: r.vietnameseStory ?? (storyData as any).vietnameseStory,
      interspersedStory:
        r.interspersedStory ?? (storyData as any).interspersedStory,
      fullEnglishStory:
        r.fullEnglishStory ?? (storyData as any).fullEnglishStory,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      titleAudioUrl: r.titleAudioUrl || undefined,
      englishContentAudioUrl: r.englishContentAudioUrl || undefined,
      vietnameseContentAudioUrl: r.vietnameseContentAudioUrl || undefined,
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
  >,
) => {
  if (!firebaseEnabled) {
    await apiPut(`/api/storybooks/${id}`, updates);
    return;
  }
  const docRef = doc(db, "storybooks", id);
  const storybook = await getDoc(docRef);
  if (storybook.exists() && storybook.data().userId !== auth.currentUser?.uid) {
    throw new Error("Permission denied.");
  }
  await updateDoc(docRef, updates);
};

export const deleteStorybook = async (id: string): Promise<void> => {
  if (!firebaseEnabled) {
    await apiDelete(`/api/storybooks/${id}`);
    return;
  }
  const docRef = doc(db, "storybooks", id);
  const storybook = await getDoc(docRef);
  if (storybook.exists() && storybook.data().userId !== auth.currentUser?.uid) {
    throw new Error("Permission denied.");
  }
  await deleteDoc(docRef);
};
