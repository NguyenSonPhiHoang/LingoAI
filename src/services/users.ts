
"use client";

import { db } from "@/lib/firebase";
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
