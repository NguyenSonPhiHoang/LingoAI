
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

// Shared, global word data
export interface Word extends VocabularyEntry {
  id?: string; // Document ID from 'words' collection
  audioUrl?: string;
  sentenceAudioUrl?: string;
}

// User-specific data linking to a global word
export interface UserVocabulary extends Word {
  id: string; // Document ID from 'userVocabulary' collection
  wordId: string; // ID of the word in the 'words' collection
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

// Function to generate a consistent hash for a term
const generateTermHash = (term: string): string => {
  return term.toLowerCase().trim().replace(/\s+/g, '-');
};


export const getVocabulary = async (userId: string): Promise<UserVocabulary[]> => {
  // 1. Get all vocabulary entries for the user
  const userVocabQuery = query(
    userVocabularyCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const userVocabSnapshot = await getDocs(userVocabQuery);
  const userVocabList = userVocabSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string, userId: string, wordId: string, [key: string]: any }));
  
  if (userVocabList.length === 0) {
    return [];
  }

  // 2. Fetch the global word data for each user vocabulary entry individually.
  // This avoids a complex 'in' query that can cause permission issues.
  const combinedVocabulary: UserVocabulary[] = [];

  for (const userVocab of userVocabList) {
      if (!userVocab.wordId) {
          console.warn(`User vocabulary item ${userVocab.id} is missing a wordId.`);
          continue;
      }
      
      const wordRef = doc(db, "words", userVocab.wordId);
      const wordSnap = await getDoc(wordRef);

      if (wordSnap.exists()) {
          const globalWordData = wordSnap.data() as Word;
          combinedVocabulary.push({
              ...globalWordData,
              ...userVocab,
              createdAt: userVocab.createdAt instanceof Timestamp ? userVocab.createdAt.toDate() : userVocab.createdAt,
          });
      } else {
          console.warn(`Could not find global word data for wordId: ${userVocab.wordId}`);
      }
  }

  return combinedVocabulary;
};


export const addWordToVocabulary = async (userId: string, wordData: Word): Promise<UserVocabulary> => {
    const wordId = generateTermHash(wordData.term);
    const wordRef = doc(db, "words", wordId);
    const wordSnap = await getDoc(wordRef);

    let finalWordData: Word;

    if (!wordSnap.exists()) {
        // Word doesn't exist in global collection, create it
        const newWord = { ...cleanObject(wordData), id: wordId };
        await setDoc(wordRef, newWord);
        finalWordData = newWord;
    } else {
        finalWordData = wordSnap.data() as Word;
    }

    // Check if the user already has this word
    const userVocabQuery = query(
        userVocabularyCollection,
        where("userId", "==", userId),
        where("wordId", "==", wordId),
        limit(1)
    );
    const userVocabSnap = await getDocs(userVocabQuery);

    if (!userVocabSnap.empty) {
        // User already has this word, just return it
        const existingUserVocabDoc = userVocabSnap.docs[0];
        const existingUserVocabData = existingUserVocabDoc.data();
        return {
            ...finalWordData,
            ...existingUserVocabData,
            id: existingUserVocabDoc.id,
            createdAt: existingUserVocabData.createdAt instanceof Timestamp ? existingUserVocabData.createdAt.toDate() : existingUserVocabData.createdAt,
        }
    }

    // Add to user's vocabulary
    const userVocabData = {
        userId,
        wordId,
        favorite: false,
        viewCount: 0,
        createdAt: Timestamp.now(),
        topic: undefined,
    };
    
    const docRef = await addDoc(userVocabularyCollection, cleanObject(userVocabData));

    return {
        ...finalWordData,
        ...userVocabData,
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

export const updateUserVocabulary = async (userVocabularyId: string, updates: Partial<Omit<UserVocabulary, 'id' | 'wordId'>>) => {
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(userVocabDoc, cleanUpdates);
  }
};

export const updateWord = async (wordId: string, updates: Partial<Omit<Word, 'id'>>) => {
  const wordDoc = doc(db, "words", wordId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(wordDoc, cleanUpdates);
  }
};


export const updateWordAudioUrl = async (wordId: string, audioUrl: string, type: 'term' | 'sentence') => {
  const wordDoc = doc(db, "words", wordId);
  const key = type === 'term' ? 'audioUrl' : 'sentenceAudioUrl';
  await updateDoc(wordDoc, { [key]: audioUrl });
};
