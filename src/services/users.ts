
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
    return {
      uid: data.uid,
      displayName: data.displayName,
      email: data.email,
      role: data.role,
      status: data.status,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as User
  })
};

export const updateUserStatus = async (uid: string, status: 'approved' | 'rejected' | 'pending') => {
  const userDoc = doc(db, "users", uid);
  await updateDoc(userDoc, { status });
};
