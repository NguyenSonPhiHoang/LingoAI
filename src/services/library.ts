"use client";

import { db, auth, firebaseEnabled } from "@/lib/firebase";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
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

export type LibrarySkill =
  | "Reading"
  | "Writing"
  | "Listening"
  | "Speaking"
  | "Pronunciation";

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

// Represents a piece of content, which can be text or an image.
export interface LibraryContent {
  id: string;
  docId: string; // The ID of the parent LibraryDocument
  userId: string;
  fileName: string;
  type: "markdown" | "image";
  content: string; // For markdown, this is text. For image, this is a data URI.
  isNotePage?: boolean;
  createdAt: any;
}

export const getNotePageForDocument = async (
  docId: string
): Promise<LibraryContent | null> => {
  if (!firebaseEnabled) {
    const res = await apiGet<{ note: LibraryContent | null }>(
      `/api/library/${docId}/note-page`
    ).catch(() => ({ note: null }));
    return res.note;
  }

  if (!auth.currentUser) return null;

  const q = query(
    collection(db, "library_content"),
    where("docId", "==", docId),
    where("userId", "==", auth.currentUser.uid),
    where("isNotePage", "==", true)
  );
  const snapshot = await getDocs(q);
  const first = snapshot.docs[0];
  if (!first) return null;

  const data = first.data();
  return {
    id: first.id,
    ...data,
    isNotePage: true,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt),
  } as LibraryContent;
};

export const upsertNotePageForDocument = async (
  docId: string,
  params: { fileName?: string; content: string }
): Promise<LibraryContent> => {
  const fileName = params.fileName?.trim() || "Note";

  if (!firebaseEnabled) {
    const res = await apiPut<{ note: LibraryContent }>(
      `/api/library/${docId}/note-page`,
      { fileName, content: params.content }
    );
    return res.note;
  }

  if (!auth.currentUser) throw new Error("Authentication required");

  const existing = await getNotePageForDocument(docId);
  if (existing) {
    const ref = doc(db, "library_content", existing.id);
    await updateDoc(ref, {
      fileName,
      content: params.content,
      updatedAt: Timestamp.now(),
    });
    return { ...existing, fileName, content: params.content, isNotePage: true };
  }

  const contentData = {
    docId,
    userId: auth.currentUser.uid,
    fileName,
    type: "markdown" as const,
    content: params.content,
    isNotePage: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const contentRef = await addDoc(
    collection(db, "library_content"),
    contentData
  );
  return {
    ...contentData,
    id: contentRef.id,
    createdAt: new Date(),
  } as unknown as LibraryContent;
};

// --- LibraryDocument Functions ---

export const getDocumentsGroupedBySkill = async (
  userId: string
): Promise<Record<LibrarySkill, LibraryDocument[]>> => {
  if (!firebaseEnabled) {
    // Backend enforces ownership via JWT.
    return apiGet<Record<LibrarySkill, LibraryDocument[]>>("/api/library");
  }

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
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : data.createdAt,
    } as LibraryDocument;

    if (acc[docSkill]) {
      acc[docSkill].push(document);
    }
    return acc;
  }, initialGrouping);

  return groupedDocs;
};

export const getDocument = async (
  docId: string
): Promise<LibraryDocument | null> => {
  if (!firebaseEnabled) {
    return apiGet<LibraryDocument>(`/api/library/${docId}`).catch(() => null);
  }

  const docRef = doc(db, "library", docId);
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
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : data.createdAt,
  } as LibraryDocument;
};

export const addDocument = async (
  userId: string,
  title: string,
  url: string,
  skill: LibrarySkill,
  summary?: string
): Promise<LibraryDocument> => {
  if (!firebaseEnabled) {
    return apiPost<LibraryDocument>("/api/library", {
      title,
      url,
      skill,
      summary,
    });
  }

  const docData = {
    userId,
    title,
    url,
    skill,
    summary: summary || "",
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(db, "library"), docData);

  return {
    ...docData,
    id: docRef.id,
    createdAt: new Date(),
  };
};

export const updateDocument = async (
  docId: string,
  updates: { title: string; url: string; skill: LibrarySkill; summary?: string }
) => {
  if (!firebaseEnabled) {
    await apiPut(`/api/library/${docId}`, updates);
    return;
  }
  const docRef = doc(db, "library", docId);
  // Optional: Add a security check to ensure the user owns this document before updating.
  await updateDoc(docRef, updates);
};

export const deleteDocument = async (docId: string) => {
  if (!firebaseEnabled) {
    await apiDelete(`/api/library/${docId}`);
    return;
  }
  if (!auth.currentUser) return;

  const batch = writeBatch(db);

  // 1. Delete the main document
  const docRef = doc(db, "library", docId);
  batch.delete(docRef);

  // 2. Delete all associated content
  const contentQuery = query(
    collection(db, "library_content"),
    where("docId", "==", docId),
    where("userId", "==", auth.currentUser.uid)
  );
  const contentSnapshot = await getDocs(contentQuery);
  contentSnapshot.forEach((contentDoc) => {
    batch.delete(contentDoc.ref);
  });

  await batch.commit();
};

// --- LibraryContent Functions ---

export const getContentForDocument = async (
  docId: string
): Promise<LibraryContent[]> => {
  if (!firebaseEnabled) {
    return apiGet<LibraryContent[]>(`/api/library/${docId}/content`).catch(
      () => []
    );
  }
  if (!auth.currentUser) return [];

  const q = query(
    collection(db, "library_content"),
    where("docId", "==", docId),
    where("userId", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
    } as LibraryContent;
  });
};

export const addContentToDocument = async (
  docId: string,
  fileName: string,
  content: string,
  type: "markdown" | "image"
): Promise<LibraryContent> => {
  if (!firebaseEnabled) {
    return apiPost<LibraryContent>(`/api/library/${docId}/content`, {
      fileName,
      type,
      content,
    });
  }
  if (!auth.currentUser) throw new Error("Authentication required");

  const contentData = {
    docId,
    userId: auth.currentUser.uid,
    fileName,
    type,
    content,
    createdAt: Timestamp.now(),
  };
  const contentRef = await addDoc(
    collection(db, "library_content"),
    contentData
  );

  return {
    ...contentData,
    id: contentRef.id,
    createdAt: new Date(),
  };
};

export const updateContent = async (
  contentId: string,
  updates: { fileName: string; content: string }
) => {
  if (!firebaseEnabled) {
    await apiPut(`/api/library/content/${contentId}`, updates);
    return;
  }
  if (!auth.currentUser) throw new Error("Authentication required");
  const contentDocRef = doc(db, "library_content", contentId);
  // TODO: Add security rule to ensure user owns this content
  await updateDoc(contentDocRef, updates);
};

export const deleteContent = async (contentId: string) => {
  if (!firebaseEnabled) {
    await apiDelete(`/api/library/content/${contentId}`);
    return;
  }
  if (!auth.currentUser) throw new Error("Authentication required");
  // Add extra security check if needed by fetching the document first
  await deleteDoc(doc(db, "library_content", contentId));
};

export const fetchDocumentContent = async (docId: string): Promise<string> => {
  const res = await apiGet<{ content: string }>(`/library/${docId}/fetch-content`);
  return res.content;
};
