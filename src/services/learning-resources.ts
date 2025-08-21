
"use client";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

const resourcesCollection = collection(db, "learningResources");

export type Skill = "Listening" | "Speaking" | "Reading" | "Writing" | "Pronunciation";
export type LevelKey = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';

export interface LearningResource {
  id: string;
  level: LevelKey;
  skill: Skill;
  label: string;
  url: string;
  createdAt: any;
}

export const getResources = async (): Promise<LearningResource[]> => {
  const q = query(
    resourcesCollection,
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    } as LearningResource
  })
};

export const addResource = async (payload: Omit<LearningResource, 'id' | 'createdAt'>): Promise<LearningResource> => {
    if (auth.currentUser?.email !== 'admin@lingoai.com') { // Replace with actual role check
        throw new Error("Only admins can add resources.");
    }
    const resourceData = {
        ...payload,
        createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(resourcesCollection, resourceData);
    
    return {
        ...resourceData,
        id: docRef.id,
        createdAt: new Date(),
    };
};

export const deleteResource = async (id: string) => {
    if (auth.currentUser?.email !== 'admin@lingoai.com') { // Replace with actual role check
        throw new Error("Only admins can delete resources.");
    }
    const resourceDoc = doc(db, "learningResources", id);
    await deleteDoc(resourceDoc);
};

    