
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
import type { VocabularyEntry } from "@/ai/flows/schemas";

// User-specific data for a word. All data is self-contained.
export interface UserVocabulary extends VocabularyEntry {
  id: string; // Document ID from 'userVocabulary' collection
  userId: string;
  favorite: boolean;
  viewCount: number;
  createdAt: any;
  topic?: string;
  audioUrl?: string;
  sentenceAudioUrl?: string;
}

const userVocabularyCollection = collection(db, "userVocabulary");

// Helper function to remove undefined properties from an object
const cleanObject = (obj: any) => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

export const getVocabulary = async (userId: string): Promise<UserVocabulary[]> => {
  const userVocabQuery = query(
    userVocabularyCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const userVocabSnapshot = await getDocs(userVocabQuery);
  return userVocabSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      } as UserVocabulary
  });
};


export const addWordToVocabulary = async (userId: string, wordData: VocabularyEntry): Promise<UserVocabulary> => {
    // Check if user already has this word (case-insensitive check on term)
    const userVocabQuery = query(
        userVocabularyCollection,
        where("userId", "==", userId),
        where("term", "==", wordData.term),
        limit(1)
    );
    const userVocabSnap = await getDocs(userVocabQuery);

    if (!userVocabSnap.empty) {
        // User already has this word, just return it
        const existingDoc = userVocabSnap.docs[0];
        const existingData = existingDoc.data();
        return {
            ...existingData,
            id: existingDoc.id,
            createdAt: existingData.createdAt instanceof Timestamp ? existingData.createdAt.toDate() : existingData.createdAt,
        } as UserVocabulary
    }

    // Add to user's vocabulary
    const newWordData: Omit<UserVocabulary, 'id' | 'createdAt'> = {
        ...wordData,
        userId,
        favorite: false,
        viewCount: 0,
    };
    
    const docRef = await addDoc(userVocabularyCollection, {
        ...newWordData,
        createdAt: Timestamp.now(),
    });

    return {
        ...newWordData,
        id: docRef.id,
        createdAt: new Date(),
    };
};

export const addMultipleWordsToVocabulary = async (words: VocabularyEntry[], userId: string): Promise<UserVocabulary[]> => {
  const addedWords: UserVocabulary[] = [];
  for (const word of words) {
    const savedWord = await addWordToVocabulary(userId, word);
    addedWords.push(savedWord);
  }
  return addedWords;
};

export const deleteUserVocabulary = async (userVocabularyId: string) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  await deleteDoc(userVocabDoc);
};

export const updateUserVocabulary = async (userVocabularyId: string, updates: Partial<Omit<UserVocabulary, 'id'>>) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(userVocabDoc, cleanUpdates);
  }
};

    