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
      // Firestore Timestamps need to be converted, but we store them as Dates
    } as Word
  })
};

export const addWordToFirestore = async (word: Omit<Word, 'id' | 'docId'>): Promise<Word> => {
    const docRef = await addDoc(vocabularyCollection, {
        ...word,
        createdAt: Timestamp.now(),
    });
    return { ...word, id: docRef.id, docId: docRef.id } as Word;
};

export const addMultipleWordsToFirestore = async (words: VocabularyEntry[], userId: string): Promise<Word[]> => {
  const newWords: Word[] = [];
  for (const word of words) {
    const newWordData: Omit<Word, 'id' | 'docId'> = {
      ...word,
      favorite: false,
      viewCount: 0,
      userId: userId,
    };
    const savedWord = await addWordToFirestore(newWordData);
    newWords.push(savedWord);
  }
  return newWords;
};

export const deleteWordFromFirestore = async (docId: string) => {
  const wordDoc = doc(db, "vocabulary", docId);
  await deleteDoc(wordDoc);
};

export const updateWordInFirestore = async (docId: string, updates: Partial<Omit<Word, 'id' | 'docId'>>) => {
  const wordDoc = doc(db, "vocabulary", docId);
  await updateDoc(wordDoc, updates);
};
