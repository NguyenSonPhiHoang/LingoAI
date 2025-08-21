
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
  getDoc,
} from "firebase/firestore";
import type { VocabularyEntry } from "@/ai/flows/schemas";

const libraryCollection = collection(db, "library");

export interface LibraryDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
  vocabulary: VocabularyEntry[];
}


export const getDocuments = async (userId: string): Promise<LibraryDocument[]> => {
  const q = query(
    libraryCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as LibraryDocument
  })
};

export const getDocument = async (docId: string): Promise<LibraryDocument | null> => {
    const docRef = doc(db, 'library', docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    const data = docSnap.data();
    // Ensure the user is authorized to read this document
    if (data.userId !== auth.currentUser?.uid) {
        throw new Error("Permission denied");
    }

    return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as LibraryDocument;
}


export const addDocument = async (userId: string, title: string, content: string, imageUrl?: string): Promise<LibraryDocument> => {
    const docData: Omit<LibraryDocument, 'id' | 'createdAt'> = {
        userId,
        title,
        content,
        vocabulary: [],
    };
    if (imageUrl) {
        docData.imageUrl = imageUrl;
    }
    const finalPayload = { ...docData, createdAt: Timestamp.now() };
    const docRef = await addDoc(libraryCollection, finalPayload);
    
    return {
        ...finalPayload,
        id: docRef.id,
        createdAt: new Date(),
    } as LibraryDocument;
};

export const updateDocument = async (docId: string, updates: Partial<LibraryDocument>) => {
    if (!auth.currentUser) throw new Error("Authentication required");
    const docRef = doc(db, 'library', docId);
    await updateDoc(docRef, updates);
}

export const deleteDocument = async (docId: string) => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "library", docId);
    await deleteDoc(docRef);
};
