"use client";

import { db, auth, firebaseEnabled } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import type { User } from "@/context/auth-context";
import { updateProfile } from "firebase/auth";

const usersCollection = firebaseEnabled
  ? collection(db, "users")
  : (null as any);

export const getAllUsers = async (): Promise<User[]> => {
  if (!firebaseEnabled) return [];

  // Removed orderBy from the query to avoid needing a composite index.
  const q = query(usersCollection);
  const snapshot = await getDocs(q);
  const users = snapshot.docs.map((doc) => {
    const data = doc.data() as any;
    // Safely handle the createdAt field and store as an ISO string to
    // match the `User.createdAt?: string` type used in the app.
    const createdAtDate =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date();
    const createdAt = createdAtDate.toISOString();
    return {
      id: data.uid ?? data.id ?? "",
      uid: data.uid,
      displayName: data.displayName,
      email: data.email,
      role: data.role,
      status: data.status,
      geminiApiKey: data.geminiApiKey,
      createdAt,
    } as User;
  });

  // Sort the users by creation date in descending order on the client-side.
  return users.sort((a, b) => {
    const dateA = a.createdAt ? Date.parse(a.createdAt) : 0;
    const dateB = b.createdAt ? Date.parse(b.createdAt) : 0;
    return dateB - dateA;
  });
};

export const updateUserStatus = async (
  uid: string,
  status: "approved" | "rejected" | "pending",
) => {
  if (!firebaseEnabled) return;
  const userDoc = doc(db, "users", uid);
  await updateDoc(userDoc, { status });
};

export const updateUserProfile = async (
  uid: string,
  updates: { displayName?: string; photoURL?: string; geminiApiKey?: string },
) => {
  if (!firebaseEnabled) return;
  const { currentUser } = auth;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error("Not authorized to perform this action.");
  }

  // Updates for Firebase Auth profile (only displayName and photoURL)
  const authUpdates: { displayName?: string; photoURL?: string } = {};
  if (updates.displayName) {
    authUpdates.displayName = updates.displayName;
  }
  if (updates.photoURL) {
    authUpdates.photoURL = updates.photoURL;
  }
  if (Object.keys(authUpdates).length > 0) {
    await updateProfile(currentUser, authUpdates);
  }

  // Update Firestore user document (all provided fields)
  const userDocRef = doc(db, "users", uid);
  await updateDoc(userDocRef, updates);
};
