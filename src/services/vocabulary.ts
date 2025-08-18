
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
  limit,
} from "firebase/firestore";
import type { VocabularyEntry as VocabularyEntrySchema } from "@/ai/flows/schemas";

// This is the base type from AI, stored in the 'words' collection.
export interface Word extends VocabularyEntrySchema {
  id: string; // Document ID from 'words' collection
  term_normalized: string;
  createdAt: any;
  audioUrl?: string;
  sentenceAudioUrl?: string;
}

// This is the user-specific data, stored in 'userVocabulary'.
export interface UserVocabulary {
  id: string; // Document ID from 'userVocabulary' collection
  userId: string;
  wordId: string; // Foreign key to the 'words' collection
  favorite: boolean;
  viewCount: number;
  topic?: string;
  createdAt: any;
}

// This is the combined, denormalized type used in the application UI.
export interface CombinedVocabulary extends Word, Omit<UserVocabulary, 'id' | 'createdAt' | 'wordId' | 'userId'> {
    userVocabularyId: string; // The ID from the user's personal list
}


const wordsCollection = collection(db, "words");
const userVocabularyCollection = collection(db, "userVocabulary");

// Helper function to remove undefined properties from an object
const cleanObject = (obj: any) => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

// GET all of a user's vocabulary, combining data from both collections.
export const getVocabulary = async (userId: string): Promise<CombinedVocabulary[]> => {
  const userVocabQuery = query(
    userVocabularyCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const userVocabSnapshot = await getDocs(userVocabQuery);

  if (userVocabSnapshot.empty) {
      return [];
  }

  const combinedVocabList: CombinedVocabulary[] = [];

  for (const userVocabDoc of userVocabSnapshot.docs) {
      const userVocabData = userVocabDoc.data() as Omit<UserVocabulary, 'id'>;
      
      // FIX: Ensure userVocabData.wordId exists before proceeding.
      // This prevents crashes from old/corrupted data that might not have a wordId.
      if (userVocabData.wordId) {
        const wordDocRef = doc(db, "words", userVocabData.wordId);
        const wordDocSnap = await getDoc(wordDocRef);

        if (wordDocSnap.exists()) {
            const wordData = wordDocSnap.data() as Omit<Word, 'id'>;
            combinedVocabList.push({
                ...wordData,
                id: wordDocSnap.id,
                userVocabularyId: userVocabDoc.id,
                favorite: userVocabData.favorite,
                viewCount: userVocabData.viewCount,
                topic: userVocabData.topic,
            });
        }
      }
  }
  
  return combinedVocabList;
};


// ADD a new word. This function handles both the global 'words' collection
// and the user-specific 'userVocabulary' collection.
export const addWordToVocabulary = async (userId: string, wordData: VocabularyEntrySchema): Promise<CombinedVocabulary> => {
    const normalizedTerm = wordData.term.toLowerCase();
    
    // 1. Check if the word exists in the global 'words' collection.
    const wordQuery = query(wordsCollection, where("term_normalized", "==", normalizedTerm), limit(1));
    const wordSnap = await getDocs(wordQuery);

    let wordDoc: Word;

    if (wordSnap.empty) {
        // 2a. If word doesn't exist globally, create it.
        const newWordPayload = {
            ...wordData,
            term_normalized: normalizedTerm,
            createdAt: Timestamp.now(),
        };
        const wordDocRef = await addDoc(wordsCollection, newWordPayload);
        wordDoc = { id: wordDocRef.id, ...newWordPayload, createdAt: newWordPayload.createdAt.toDate() };
    } else {
        // 2b. If word exists, use the existing document.
        const doc = wordSnap.docs[0];
        const data = doc.data();
        wordDoc = { id: doc.id, ...data, createdAt: data.createdAt.toDate() } as Word;
    }

    // 3. Check if the user already has this word in their personal list.
    const userVocabQuery = query(
        userVocabularyCollection,
        where("userId", "==", userId),
        where("wordId", "==", wordDoc.id),
        limit(1)
    );
    const userVocabSnap = await getDocs(userVocabQuery);
    
    let userVocabDoc: UserVocabulary;
    
    if (userVocabSnap.empty) {
        // 4a. If user doesn't have it, create a new link in `userVocabulary`.
        const newUserVocabularyPayload = {
            userId,
            wordId: wordDoc.id,
            favorite: false,
            viewCount: 0,
            topic: null,
            createdAt: Timestamp.now(),
        };
        const userVocabDocRef = await addDoc(userVocabularyCollection, newUserVocabularyPayload);
        userVocabDoc = { id: userVocabDocRef.id, ...newUserVocabularyPayload, createdAt: newUserVocabularyPayload.createdAt.toDate() };
    } else {
        // 4b. If user already has it, use the existing document.
         const doc = userVocabSnap.docs[0];
         const data = doc.data();
         userVocabDoc = { id: doc.id, ...data, createdAt: data.createdAt.toDate() } as UserVocabulary;
    }
    
    // 5. Return the combined data for immediate UI update.
    const { id: wordId, userId: uId, createdAt, ...restOfUserVocab } = userVocabDoc;

    return {
        ...wordDoc,
        userVocabularyId: userVocabDoc.id,
        ...restOfUserVocab,
    };
};


export const addMultipleWordsToVocabulary = async (words: VocabularyEntrySchema[], userId: string): Promise<CombinedVocabulary[]> => {
  const addedOrUpdatedWords: CombinedVocabulary[] = [];
  for (const word of words) {
    const savedWord = await addWordToVocabulary(userId, word);
    addedOrUpdatedWords.push(savedWord);
  }
  return addedOrUpdatedWords;
};

// Deletes the entry from the user's personal list, not the global word.
export const deleteUserVocabulary = async (userVocabularyId: string) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  await deleteDoc(userVocabDoc);
};

// Updates fields in the `userVocabulary` collection (e.g., favorite, viewCount).
export const updateUserVocabulary = async (userVocabularyId: string, updates: Partial<Omit<UserVocabulary, 'id' | 'wordId' | 'userId' | 'createdAt'>>) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(userVocabDoc, cleanUpdates);
  }
};

// Updates fields in the global `words` collection (e.g., adding an audioUrl).
export const updateWord = async (wordId: string, updates: Partial<Omit<Word, 'id' | 'createdAt' | 'term_normalized'>>) => {
    const wordDoc = doc(db, "words", wordId);
    const cleanUpdates = cleanObject(updates);
    if(Object.keys(cleanUpdates).length > 0) {
        await updateDoc(wordDoc, cleanUpdates);
    }
};
