"use client";

import { db, auth, firebaseEnabled } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  runTransaction,
} from "firebase/firestore";

const resourcesCollection = firebaseEnabled
  ? collection(db, "learningResources")
  : (null as any);

export type Skill =
  | "Listening"
  | "Speaking"
  | "Reading"
  | "Writing"
  | "Pronunciation";
export type LevelKey = "a1" | "a2" | "b1" | "b2" | "c1" | "c2";

export interface LearningResource {
  id: string;
  level: LevelKey;
  skill: Skill;
  label: string;
  url: string;
  createdAt: any;
  // Rating fields
  ratings: Record<string, number>; // Map of userId -> rating (1-5)
  ratingCount: number;
  averageRating: number;
}

export const getResources = async (): Promise<LearningResource[]> => {
  if (!firebaseEnabled) return [];

  const q = query(resourcesCollection, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      level: data.level,
      skill: data.skill,
      label: data.label,
      url: data.url,
      ratings: data.ratings || {},
      ratingCount: data.ratingCount || 0,
      averageRating: data.averageRating || 0,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : data.createdAt,
    } as LearningResource;
  });
};

export const addResource = async (
  payload: Omit<
    LearningResource,
    "id" | "createdAt" | "ratings" | "ratingCount" | "averageRating"
  >
): Promise<LearningResource> => {
  if (!firebaseEnabled) {
    return {
      ...payload,
      id: `resource_${Date.now()}`,
      createdAt: new Date(),
      ratings: {},
      ratingCount: 0,
      averageRating: 0,
    };
  }

  if (auth.currentUser?.email !== "admin@lingoai.com") {
    // Replace with actual role check
    throw new Error("Only admins can add resources.");
  }
  const resourceData = {
    ...payload,
    createdAt: Timestamp.now(),
    ratings: {},
    ratingCount: 0,
    averageRating: 0,
  };
  const docRef = await addDoc(resourcesCollection, resourceData);

  return {
    ...resourceData,
    id: docRef.id,
    createdAt: new Date(),
  };
};

export const deleteResource = async (id: string) => {
  if (!firebaseEnabled) return;

  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required.");
  // A more robust solution would be custom claims for roles
  // For now, we allow deletion by the creator or an admin.
  // Let's assume only admin can delete for now.
  // const resource = await getResource(id); - logic to check ownership can be added

  const resourceDoc = doc(db, "learningResources", id);
  await deleteDoc(resourceDoc);
};

export const rateResource = async (
  resourceId: string,
  rating: number
): Promise<{ averageRating: number; ratingCount: number }> => {
  if (!firebaseEnabled) return { averageRating: 0, ratingCount: 0 };

  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to rate.");
  if (rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5.");

  const resourceRef = doc(db, "learningResources", resourceId);

  try {
    let newAverageRating = 0;
    let newRatingCount = 0;

    await runTransaction(db, async (transaction) => {
      const resourceDoc = await transaction.get(resourceRef);
      if (!resourceDoc.exists()) {
        throw new Error("Resource does not exist!");
      }

      const data = resourceDoc.data() as LearningResource;
      const currentRatings = data.ratings || {};
      const oldRating = currentRatings[user.uid];

      const newRatings = { ...currentRatings, [user.uid]: rating };

      newRatingCount = data.ratingCount || 0;
      let totalRating = (data.averageRating || 0) * newRatingCount;

      if (oldRating !== undefined) {
        // User is changing their rating
        totalRating = totalRating - oldRating + rating;
      } else {
        // New user rating
        totalRating = totalRating + rating;
        newRatingCount++;
      }

      newAverageRating = newRatingCount > 0 ? totalRating / newRatingCount : 0;

      transaction.update(resourceRef, {
        ratings: newRatings,
        ratingCount: newRatingCount,
        averageRating: newAverageRating,
      });
    });

    return { averageRating: newAverageRating, ratingCount: newRatingCount };
  } catch (e) {
    console.error("Rating transaction failed: ", e);
    throw e;
  }
};
