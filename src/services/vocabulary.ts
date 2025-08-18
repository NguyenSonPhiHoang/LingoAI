
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
import { createHash } from 'crypto';


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
  // Simple hash function (for demonstration; consider a more robust one for production)
  // In a real app, you might use a library or a more complex algorithm.
  // For Node.js environment:
  // return createHash('sha256').update(term.toLowerCase().trim()).digest('hex');
  // For client-side, a simple string manipulation can work if collisions are acceptable for this use case.
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

  // 2. Get all unique word IDs
  const wordIds = [...new Set(userVocabList.map(uv => uv.wordId))];

  // 3. Fetch the global word data for those IDs
  // Firestore 'in' queries are limited to 30 items. We need to batch them.
  const wordDataMap = new Map<string, Word>();
  const CHUNK_SIZE = 30;
  for (let i = 0; i < wordIds.length; i += CHUNK_SIZE) {
      const chunk = wordIds.slice(i, i + CHUNK_SIZE);
      const wordsQuery = query(wordsCollection, where('id', 'in', chunk));
      const wordsSnapshot = await getDocs(wordsQuery);
      wordsSnapshot.forEach(doc => {
          const data = doc.data() as Word;
          wordDataMap.set(data.id!, data);
      });
  }

  // 4. Combine user data with global word data
  return userVocabList.map(userVocab => {
    const globalWordData = wordDataMap.get(userVocab.wordId);
    if (!globalWordData) {
        // This case should ideally not happen if data is consistent
        console.warn(`Could not find global word data for wordId: ${userVocab.wordId}`);
        return null;
    }
    return {
      ...globalWordData, // term, definition, etc.
      ...userVocab, // overrides with user-specific data like favorite, topic
      createdAt: userVocab.createdAt instanceof Timestamp ? userVocab.createdAt.toDate() : userVocab.createdAt,
    };
  }).filter((item): item is UserVocabulary => item !== null);
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
