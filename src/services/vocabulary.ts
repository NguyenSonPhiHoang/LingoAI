
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

// This is the full type for a word in the user's list, including all details.
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
        // User already has this word. Update it to ensure data is consistent.
        const existingDoc = userVocabSnap.docs[0];
        await updateUserVocabulary(existingDoc.id, wordData);
        
        const updatedData = { ...existingDoc.data(), ...wordData };

        return {
            ...updatedData,
            id: existingDoc.id,
            createdAt: updatedData.createdAt instanceof Timestamp ? updatedData.createdAt.toDate() : updatedData.createdAt,
        } as UserVocabulary
    }

    // Add to user's vocabulary
    const newWordData: Omit<UserVocabulary, 'id'> = {
        ...wordData,
        userId,
        favorite: false,
        viewCount: 0,
        createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(userVocabularyCollection, newWordData);

    return {
        ...newWordData,
        id: docRef.id,
        createdAt: new Date(),
    };
};

export const addMultipleWordsToVocabulary = async (words: VocabularyEntry[], userId: string): Promise<UserVocabulary[]> => {
  const addedWords: UserVocabulary[] = [];
  // Use a batch for efficiency, but process one-by-one logic inside the loop for existence checks
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
