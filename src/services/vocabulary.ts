
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

// This represents the data stored in the global `words` collection.
export interface Word extends VocabularyEntry {
  id: string; // Document ID from 'words' collection
  createdAt: any;
  audioUrl?: string;
  sentenceAudioUrl?: string;
}

// This is the full type for a word in the user's list, combining user-specific data
// with the global word data. This is the type used throughout the UI.
export interface UserVocabulary extends Word {
  id: string; // Document ID from 'userVocabulary' collection
  wordId: string; // The ID of the word in the global 'words' collection
  userId: string;
  favorite: boolean;
  viewCount: number;
  createdAt: any;
  topic?: string;
}


const wordsCollection = collection(db, "words");
const userVocabularyCollection = collection(db, "userVocabulary");

// Helper function to remove undefined properties from an object
const cleanObject = (obj: any) => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

// GET all of a user's vocabulary, enriched with global word data.
export const getVocabulary = async (userId: string): Promise<UserVocabulary[]> => {
  // 1. Get the user's personalized vocabulary list
  const userVocabQuery = query(
    userVocabularyCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const userVocabSnapshot = await getDocs(userVocabQuery);
  const userVocabList = userVocabSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
  })) as (Omit<UserVocabulary, keyof Word> & {wordId: string})[];

  if (userVocabList.length === 0) {
    return [];
  }
  
  // 2. Fetch the corresponding global word data for each item.
  // We fetch one-by-one to avoid permission issues with 'in' queries on a global collection.
  const enrichedVocabulary: UserVocabulary[] = [];
  for (const userVocabItem of userVocabList) {
      try {
          const wordDocRef = doc(db, "words", userVocabItem.wordId);
          const wordDocSnap = await getDoc(wordDocRef);
          if (wordDocSnap.exists()) {
              const wordData = wordDocSnap.data() as Omit<Word, 'id'>;
              enrichedVocabulary.push({
                  ...wordData,
                  ...userVocabItem,
                  id: userVocabItem.id, // UserVocabulary doc ID
                  wordId: wordDocSnap.id, // Word doc ID
              });
          }
      } catch (e) {
          console.error(`Failed to fetch word ${userVocabItem.wordId}:`, e);
          // Continue fetching others even if one fails
      }
  }

  return enrichedVocabulary;
};

// ADD a new word. This handles both creating the global word if it doesn't exist
// and linking it to the user's personal vocabulary.
export const addWordToVocabulary = async (userId: string, wordData: VocabularyEntry): Promise<UserVocabulary> => {
    // 1. Check if the word exists in the global `words` collection (case-insensitive)
    const normalizedTerm = wordData.term.toLowerCase();
    const wordQuery = query(
        wordsCollection,
        where("term_normalized", "==", normalizedTerm),
        limit(1)
    );
    const wordSnap = await getDocs(wordQuery);

    let wordId: string;
    let wordDocData: Word;

    if (wordSnap.empty) {
        // 2a. If word doesn't exist globally, create it.
        const newWordPayload = {
            ...wordData,
            term_normalized: normalizedTerm,
            createdAt: Timestamp.now(),
        };
        const wordDocRef = await addDoc(wordsCollection, newWordPayload);
        wordId = wordDocRef.id;
        wordDocData = { ...newWordPayload, id: wordId };
    } else {
        // 2b. If word exists, use its ID and data.
        const existingDoc = wordSnap.docs[0];
        wordId = existingDoc.id;
        wordDocData = { id: wordId, ...existingDoc.data() } as Word;
    }

    // 3. Check if the user already has this word in their personal list.
    const userVocabQuery = query(
        userVocabularyCollection,
        where("userId", "==", userId),
        where("wordId", "==", wordId),
        limit(1)
    );
    const userVocabSnap = await getDocs(userVocabQuery);

    if (!userVocabSnap.empty) {
        // 4a. If user already has it, return the existing combined data.
        const userVocabDoc = userVocabSnap.docs[0];
        const userVocabData = userVocabDoc.data() as Omit<UserVocabulary, keyof Word>;
        return { ...wordDocData, ...userVocabData, id: userVocabDoc.id };
    } else {
        // 4b. If user doesn't have it, create the link in `userVocabulary`.
        const newUserVocabularyPayload = {
            userId,
            wordId,
            favorite: false,
            viewCount: 0,
            createdAt: Timestamp.now(),
            topic: null,
        };
        const userVocabDocRef = await addDoc(userVocabularyCollection, newUserVocabularyPayload);
        
        return {
            ...wordDocData,
            ...newUserVocabularyPayload,
            id: userVocabDocRef.id,
        };
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

// Updates fields in the `userVocabulary` collection (e.g., favorite, topic).
export const updateUserVocabulary = async (userVocabularyId: string, updates: Partial<Omit<UserVocabulary, 'id' | keyof Word>>) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(userVocabDoc, cleanUpdates);
  }
};

// Updates fields in the global `words` collection (e.g., audioUrl, definition).
export const updateWord = async (wordId: string, updates: Partial<Omit<Word, 'id'>>) => {
  const wordDoc = doc(db, "words", wordId);
  const cleanUpdates = cleanObject(updates);
  if(Object.keys(cleanUpdates).length > 0) {
    await updateDoc(wordDoc, cleanUpdates);
  }
};
