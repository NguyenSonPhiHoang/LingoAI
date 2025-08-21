
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
  writeBatch,
} from "firebase/firestore";

export type LibrarySkill = "Reading" | "Writing" | "Listening" | "Speaking" | "Pronunciation";

// Represents the main document/link saved by the user.
export interface LibraryDocument {
  id: string;
  userId: string;
  skill: LibrarySkill;
  title: string;
  url: string;
  summary?: string;
  createdAt: any;
}

// Represents a piece of content extracted from a file, associated with a LibraryDocument.
export interface LibraryContent {
    id: string;
    docId: string; // The ID of the parent LibraryDocument
    userId: string;
    fileName: string;
    extractedText: string;
    createdAt: any;
}


// --- LibraryDocument Functions ---

export const getDocumentsGroupedBySkill = async (userId: string): Promise<Record<LibrarySkill, LibraryDocument[]>> => {
  const q = query(
    collection(db, "library"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  
  const initialGrouping: Record<LibrarySkill, LibraryDocument[]> = {
    Reading: [],
    Writing: [],
    Listening: [],
    Speaking: [],
    Pronunciation: [],
  };
  
  const groupedDocs = snapshot.docs.reduce((acc, doc) => {
    const data = doc.data();
    const docSkill = data.skill as LibrarySkill;
    const document = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as LibraryDocument;
    
    if (acc[docSkill]) {
        acc[docSkill].push(document);
    }
    return acc;
  }, initialGrouping);

  return groupedDocs;
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


export const addDocument = async (userId: string, title: string, url: string, skill: LibrarySkill, summary?: string): Promise<LibraryDocument> => {
    const docData = {
        userId,
        title,
        url,
        skill,
        summary: summary || '',
        createdAt: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, "library"), docData);
    
    return {
        ...docData,
        id: docRef.id,
        createdAt: new Date(),
    };
};

export const updateDocument = async (docId: string, updates: { title: string; url: string; skill: LibrarySkill; summary?: string }) => {
    const docRef = doc(db, 'library', docId);
    // Optional: Add a security check to ensure the user owns this document before updating.
    await updateDoc(docRef, updates);
};

export const deleteDocument = async (docId: string) => {
    if (!auth.currentUser) return;
    
    const batch = writeBatch(db);
    
    // 1. Delete the main document
    const docRef = doc(db, "library", docId);
    batch.delete(docRef);
    
    // 2. Delete all associated content
    const contentQuery = query(collection(db, "library_content"), where("docId", "==", docId), where("userId", "==", auth.currentUser.uid));
    const contentSnapshot = await getDocs(contentQuery);
    contentSnapshot.forEach(contentDoc => {
        batch.delete(contentDoc.ref);
    });
    
    await batch.commit();
};


// --- LibraryContent Functions ---

export const getContentForDocument = async (docId: string): Promise<LibraryContent[]> => {
    if (!auth.currentUser) return [];

    const q = query(
        collection(db, "library_content"),
        where("docId", "==", docId),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        } as LibraryContent;
    });
};

export const addContentToDocument = async (docId: string, fileName: string, extractedText: string): Promise<LibraryContent> => {
    if (!auth.currentUser) throw new Error("Authentication required");

    const contentData = {
        docId,
        userId: auth.currentUser.uid,
        fileName,
        extractedText,
        createdAt: Timestamp.now(),
    };
    const contentRef = await addDoc(collection(db, "library_content"), contentData);

    return {
        ...contentData,
        id: contentRef.id,
        createdAt: new Date(),
    };
};

export const updateContent = async (contentId: string, updates: { fileName: string; extractedText: string; }) => {
    if (!auth.currentUser) throw new Error("Authentication required");
    const contentDocRef = doc(db, "library_content", contentId);
    // TODO: Add security rule to ensure user owns this content
    await updateDoc(contentDocRef, updates);
};


export const deleteContent = async (contentId: string) => {
    if (!auth.currentUser) throw new Error("Authentication required");
    // Add extra security check if needed by fetching the document first
    await deleteDoc(doc(db, "library_content", contentId));
};
