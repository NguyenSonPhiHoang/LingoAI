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
} from "firebase/firestore";
import type { Word } from "@/components/lingo/vocabulary-list";
import type { VocabularyEntry } from "@/ai/flows/schemas";

const vocabularyCollection = collection(db, "vocabulary");

export const getVocabulary = async (userId: string): Promise<Word[]> => {
  const q = query(
    vocabularyCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      docId: doc.id,
      // Firestore Timestamps need to be converted to Date objects for serialization
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as Word
  })
};

export const addWordToFirestore = async (word: Omit<Word, 'id' | 'docId' | 'createdAt'>): Promise<Word> => {
    const docRef = await addDoc(vocabularyCollection, {
        ...word,
        createdAt: Timestamp.now(),
    });
    const newWordData = { ...word, id: docRef.id, docId: docRef.id };
    
    // Convert Firestore Timestamp to JS Date for immediate use in the client
    const finalWord = {
        ...newWordData,
        createdAt: new Date() 
    }
    return finalWord as Word;
};

export const addMultipleWordsToFirestore = async (words: VocabularyEntry[], userId: string): Promise<Word[]> => {
  const batch = writeBatch(db);
  const newWords: Word[] = [];
  
  for (const word of words) {
    const newWordData: Omit<Word, 'id' | 'docId' | 'createdAt'> = {
      ...word,
      favorite: false,
      viewCount: 0,
      userId: userId,
      topic: undefined, // New words don't have a topic
    };
    const docRef = doc(vocabularyCollection); // Create a new doc reference
    batch.set(docRef, { ...newWordData, createdAt: Timestamp.now() });
    
    newWords.push({
      ...newWordData,
      id: docRef.id,
      docId: docRef.id,
      createdAt: new Date(), // Use current date for immediate client state update
    } as Word);
  }
  
  await batch.commit();
  return newWords;
};


export const deleteWordFromFirestore = async (docId: string) => {
  const wordDoc = doc(db, "vocabulary", docId);
  await deleteDoc(wordDoc);
};

export const updateWordInFirestore = async (docId: string, updates: Partial<Omit<Word, 'id' | 'docId'>>) => {
  const wordDoc = doc(db, "vocabulary", docId);
  // Remove undefined values, as Firestore doesn't allow them in updates.
  const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
  await updateDoc(wordDoc, cleanUpdates);
};
