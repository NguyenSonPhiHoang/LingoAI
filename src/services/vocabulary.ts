
"use client";

import { db, auth } from "@/lib/firebase";
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
import type { VocabularyEntry } from "@/ai/flows/schemas";

// This is the base type, stored in the 'words' collection.
// It only contains the term and pronunciation, which are global.
export interface Word {
  id: string; // Document ID from 'words' collection
  term: string;
  term_normalized: string;
  pronunciation: string;
  createdAt: Timestamp;
  audioUrl?: string; 
}

// This is the user-specific data, stored in 'userVocabulary'.
// It contains all AI-generated details and user-specific metadata.
export interface UserVocabulary {
  id: string; // Document ID from 'userVocabulary' collection
  userId: string;
  wordId: string; // Foreign key to the 'words' collection

  // AI-generated fields, specific to the user
  partOfSpeech: string;
  definition: string;
  vietnameseDefinition: string;
  sentence: string;
  vietnameseSentence: string;
  sentenceAudioUrl?: string;
  
  // User-specific metadata
  favorite: boolean;
  topic?: string;
  createdAt: Timestamp;
}


// This is the combined, denormalized type used in the application UI.
export type CombinedVocabulary = Word & Omit<UserVocabulary, 'id' | 'wordId' | 'userId' | 'createdAt'> & {
    userVocabularyId: string;
};


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
      const userVocabData = userVocabDoc.data() as UserVocabulary;
      
      if (userVocabData && userVocabData.wordId) {
        const wordDocRef = doc(db, "words", userVocabData.wordId);
        const wordDocSnap = await getDoc(wordDocRef);

        if (wordDocSnap.exists()) {
            const wordData = wordDocSnap.data() as Omit<Word, 'id'>;
            combinedVocabList.push({
                ...wordData,
                id: wordDocSnap.id,
                ...userVocabData,
                userVocabularyId: userVocabDoc.id,
            });
        }
      }
  }
  
  return combinedVocabList;
};

// GET all words from the global collection (for Admin)
export const getAllWords = async (): Promise<Word[]> => {
  const q = query(wordsCollection, orderBy("term_normalized", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Word));
};


// ADD a new word. This function separates global data from user-specific data.
export const addWordToVocabulary = async (userId: string, fullWordData: VocabularyEntry): Promise<CombinedVocabulary> => {
    const normalizedTerm = fullWordData.term.toLowerCase();
    
    // 1. Check if the word exists in the global 'words' collection.
    const wordQuery = query(wordsCollection, where("term_normalized", "==", normalizedTerm), limit(1));
    const wordSnap = await getDocs(wordQuery);

    let wordDocId: string;
    let wordDataForCombine: Word;

    if (wordSnap.empty) {
        // 2a. If word doesn't exist globally, create it with minimal data.
        const newWordPayload = {
            term: fullWordData.term,
            pronunciation: fullWordData.pronunciation,
            term_normalized: normalizedTerm,
            createdAt: Timestamp.now(),
        };
        const wordDocRef = await addDoc(wordsCollection, newWordPayload);
        wordDocId = wordDocRef.id;
        wordDataForCombine = { ...newWordPayload, id: wordDocId };
    } else {
        // 2b. If word exists, use its ID.
        const doc = wordSnap.docs[0];
        wordDocId = doc.id;
        wordDataForCombine = { ...doc.data(), id: doc.id } as Word;
    }

    // 3. Check if the user already has this word in their personal list.
    const userVocabQuery = query(
        userVocabularyCollection,
        where("userId", "==", userId),
        where("wordId", "==", wordDocId),
        limit(1)
    );
    const userVocabSnap = await getDocs(userVocabQuery);
    
    let userVocabDocRefId: string;
    
    // 4. Create or Update the user-specific vocabulary entry
    const userSpecificPayload = {
        userId,
        wordId: wordDocId,
        partOfSpeech: fullWordData.partOfSpeech,
        definition: fullWordData.definition,
        vietnameseDefinition: fullWordData.vietnameseDefinition,
        sentence: fullWordData.sentence,
        vietnameseSentence: fullWordData.vietnameseSentence,
        favorite: false,
        createdAt: Timestamp.now(),
    };

    if (userVocabSnap.empty) {
        // If user doesn't have it, create a new link in `userVocabulary`.
        const docRef = await addDoc(userVocabularyCollection, userSpecificPayload);
        userVocabDocRefId = docRef.id;
    } else {
        // If user already has it, update it with the new AI-generated details
        const userVocabDocToUpdateRef = userVocabSnap.docs[0].ref;
        // Don't overwrite favorite status or topic when re-adding
        const { favorite, topic, ...restOfPayload } = userSpecificPayload;
        await updateDoc(userVocabDocToUpdateRef, restOfPayload);
        userVocabDocRefId = userVocabDocToUpdateRef.id;
    }
    
    const finalUserVocabSnap = await getDoc(doc(db, "userVocabulary", userVocabDocRefId));
    const finalUserVocabData = finalUserVocabSnap.data() as UserVocabulary;

    // 5. Return the combined data for immediate UI update.
    return {
        ...wordDataForCombine,
        ...finalUserVocabData,
        userVocabularyId: userVocabDocRefId,
    };
};


export const addMultipleWordsToVocabulary = async (words: VocabularyEntry[], userId: string): Promise<CombinedVocabulary[]> => {
  const addedOrUpdatedWords: CombinedVocabulary[] = [];
  for (const word of words) {
    const savedWord = await addWordToVocabulary(userId, word);
    addedOrUpdatedWords.push(savedWord);
  }
  return addedOrUpdatedWords;
};

// Deletes the entry from the user's personal list, not the global word.
export const deleteUserVocabulary = async (userVocabularyId: string) => {
  if (!auth.currentUser) return;
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  await deleteDoc(userVocabDoc);
};

// Updates fields in the `userVocabulary` collection.
export const updateUserVocabulary = async (userVocabularyId: string, updates: Partial<Omit<UserVocabulary, 'id' | 'wordId' | 'userId' | 'createdAt'>>) => {
  if (!auth.currentUser) return;
  
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(userVocabDoc, cleanUpdates);
  }
};

// Updates fields in the global `words` collection (for Admin).
export const updateWord = async (wordId: string, updates: Partial<Pick<Word, 'term' | 'pronunciation' | 'audioUrl'>>) => {
    if (!auth.currentUser) return;
    
    const wordDoc = doc(db, "words", wordId);
    const cleanUpdates = cleanObject({
        ...updates,
        term_normalized: updates.term?.toLowerCase(),
    });
    if(Object.keys(cleanUpdates).length > 0) {
        await updateDoc(wordDoc, cleanUpdates);
    }
};
