
"use client";

import { db, auth } from "@/lib/firebase";
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

const usersCollection = collection(db, "users");

export const getAllUsers = async (): Promise<User[]> => {
  const q = query(
    usersCollection,
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    // Handle both serverTimestamp and already converted Timestamps
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    return {
      uid: data.uid,
      displayName: data.displayName,
      email: data.email,
      role: data.role,
      status: data.status,
      createdAt,
    } as User
  })
};

export const updateUserStatus = async (uid: string, status: 'approved' | 'rejected' | 'pending') => {
  const userDoc = doc(db, "users", uid);
  await updateDoc(userDoc, { status });
};

export const updateUserProfile = async (uid: string, updates: { displayName?: string, photoURL?: string }) => {
    const { currentUser } = auth;
    if (!currentUser || currentUser.uid !== uid) {
        throw new Error("Not authorized to perform this action.");
    }

    const authUpdates: { displayName?: string, photoURL?: string } = {};
    if (updates.displayName) {
        authUpdates.displayName = updates.displayName;
    }
    if (updates.photoURL) {
        authUpdates.photoURL = updates.photoURL;
    }
    
    // Update Firebase Auth profile
    if (Object.keys(authUpdates).length > 0) {
        await updateProfile(currentUser, authUpdates);
    }
    
    // Update Firestore user document
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, updates);

    // Note: The AuthContext's onSnapshot listener will automatically update the UI
    // with the new information from Firestore.
};
