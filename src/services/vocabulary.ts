
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

// Helper function to remove undefined properties from an object
const cleanObject = (obj: any) => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

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
    const cleanWord = cleanObject(word);
    const docRef = await addDoc(vocabularyCollection, {
        ...cleanWord,
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
      topic: undefined, // Let this be undefined initially
    };
    const docRef = doc(vocabularyCollection); // Create a new doc reference
    
    // Clean the object before setting it in the batch
    const cleanWordData = cleanObject(newWordData);
    batch.set(docRef, { ...cleanWordData, createdAt: Timestamp.now() });
    
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
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(wordDoc, cleanUpdates);
  }
};
