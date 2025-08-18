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
} from "firebase/firestore";
import type { Word } from "@/components/lingo/vocabulary-list";
import type { VocabularyEntry } from "@/ai/flows/schemas";

const vocabularyCollection = collection(db, "vocabulary");

export const getVocabulary = async (): Promise<Word[]> => {
  const q = query(vocabularyCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
      ...(doc.data() as Omit<Word, "id" | "docId">),
      id: doc.id,
      docId: doc.id,
  })) as Word[];
};

export const addWordToFirestore = async (word: Omit<Word, 'id' | 'docId'>) => {
    const docRef = await addDoc(vocabularyCollection, {
        ...word,
        createdAt: new Date(),
    });
    return { ...word, id: docRef.id, docId: docRef.id };
};

export const addMultipleWordsToFirestore = async (words: VocabularyEntry[]) => {
  const newWords: Word[] = [];
  for (const word of words) {
    const newWordData = {
      ...word,
      favorite: false,
      viewCount: 0,
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

export const updateWordInFirestore = async (docId: string, updates: Partial<Word>) => {
  const wordDoc = doc(db, "vocabulary", docId);
  await updateDoc(wordDoc, updates);
};
