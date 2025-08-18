
"use client";

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
  getDoc,
  limit
} from "firebase/firestore";
import type { VocabularyEntry as VocabularyEntrySchema } from "@/ai/flows/schemas";

// This is the base type from AI, without any user or DB data
export type VocabularyEntry = VocabularyEntrySchema;

// This is the full type for a word in the user's list.
// It includes all word details plus user-specific data.
export interface UserVocabulary extends VocabularyEntry {
  id: string; // Document ID from 'userVocabulary' collection
  userId: string;
  favorite: boolean;
  viewCount: number;
  topic?: string;
  createdAt: any;
  audioUrl?: string;
  sentenceAudioUrl?: string;
  term_normalized: string;
}

const userVocabularyCollection = collection(db, "userVocabulary");

// Helper function to remove undefined properties from an object
const cleanObject = (obj: any) => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

// GET all of a user's vocabulary.
export const getVocabulary = async (userId: string): Promise<UserVocabulary[]> => {
  const userVocabQuery = query(
    userVocabularyCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const userVocabSnapshot = await getDocs(userVocabQuery);
  return userVocabSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
  })) as UserVocabulary[];
};

// ADD a new word to the user's personal vocabulary list.
export const addWordToVocabulary = async (userId: string, wordData: VocabularyEntry): Promise<UserVocabulary> => {
    const normalizedTerm = wordData.term.toLowerCase();

    // 1. Check if the user already has this word in their personal list.
    const userVocabQuery = query(
        userVocabularyCollection,
        where("userId", "==", userId),
        where("term_normalized", "==", normalizedTerm),
        limit(1)
    );
    const userVocabSnap = await getDocs(userVocabQuery);

    if (!userVocabSnap.empty) {
        // 2a. If user already has it, update it with the new details (in case it was incomplete).
        const userVocabDoc = userVocabSnap.docs[0];
        const updatedData = { ...userVocabDoc.data(), ...wordData };
        await updateDoc(doc(db, "userVocabulary", userVocabDoc.id), wordData);
        return {
          id: userVocabDoc.id,
          ...updatedData
        } as UserVocabulary;
    } else {
        // 2b. If user doesn't have it, create a new document in `userVocabulary`.
        const newUserVocabularyPayload = {
            ...wordData,
            userId,
            term_normalized: normalizedTerm,
            favorite: false,
            viewCount: 0,
            topic: null,
            createdAt: Timestamp.now(),
        };
        const userVocabDocRef = await addDoc(userVocabularyCollection, newUserVocabularyPayload);
        
        return {
            id: userVocabDocRef.id,
            ...newUserVocabularyPayload,
        } as UserVocabulary;
    }
};

export const addMultipleWordsToVocabulary = async (words: VocabularyEntry[], userId: string): Promise<UserVocabulary[]> => {
  const addedOrUpdatedWords: UserVocabulary[] = [];
  for (const word of words) {
    const savedWord = await addWordToVocabulary(userId, word);
    addedOrUpdatedWords.push(savedWord);
  }
  return addedOrUpdatedWords;
};

export const deleteUserVocabulary = async (userVocabularyId: string) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  await deleteDoc(userVocabDoc);
};

// Updates fields in the `userVocabulary` collection.
export const updateUserVocabulary = async (userVocabularyId: string, updates: Partial<Omit<UserVocabulary, 'id'>>) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(userVocabDoc, cleanUpdates);
  }
};

// This function is now an alias for updateUserVocabulary for simplicity.
export const updateWord = async (userVocabularyId: string, updates: Partial<Omit<UserVocabulary, 'id'>>) => {
    await updateUserVocabulary(userVocabularyId, updates);
};

