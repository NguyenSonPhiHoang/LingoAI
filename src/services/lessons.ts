"use client";

import { db, auth, firebaseEnabled } from "@/lib/firebase";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import type { LessonSuggestion, UserLevel } from "@/ai/flows/schemas";

const lessonsCollection = firebaseEnabled
  ? collection(db, "lessons")
  : (null as any);

// Can be extended with more specific exercise types
export type Exercise = any;

export type LessonStatus = "not-started" | "in-progress" | "completed";

export interface LessonContent {
  id: string;
  type: "vocabulary" | "keyPoints" | "passage";
  value: string;
}

export interface Lesson extends LessonSuggestion {
  id: string;
  docId: string;
  userId: string;
  createdAt: any;
  level: UserLevel;
  status: LessonStatus;
  topicGroup: string; // The user-defined goal for grouping
  content?: LessonContent[];
  exercises?: {
    reading?: Exercise;
    writing?: Exercise;
    listening?: Exercise;
    speaking?: Exercise;
    pronunciation?: Exercise;
  };
}

export type LessonVocabularyItem = {
  id: string;
  term: string;
  definition: string;
  pronunciation?: string;
  partOfSpeech?: string;
};

type SqlLesson = {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  level?: string | null;
  language?: string | null;
  authorId?: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LessonStorybookSeed = {
  level: UserLevel;
  vocabulary: Array<{ term: string; definition: string }>;
};

type SqlUserLessonProgress = {
  userId: string;
  lessonId: string;
  status?: string | null;
  progress?: number | null;
  lastSeen?: string;
  lessonTitle?: string;
};

type LessonMetaPayload = {
  topic?: string;
  skill?: LessonSuggestion["skill"];
  topicGroup?: string;
  level?: UserLevel;
  status?: LessonStatus;
  content?: LessonContent[];
  exercises?: Lesson["exercises"];
};

const safeJsonParse = (raw: string | null | undefined): any => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toUserLevel = (raw: any): UserLevel => {
  if (raw === "beginner" || raw === "intermediate" || raw === "advanced")
    return raw;
  return "beginner";
};

const mapSqlLessonToClient = (
  sql: SqlLesson,
  userId: string,
  progressByLessonId: Record<string, SqlUserLessonProgress>
): Lesson => {
  const meta = safeJsonParse(sql.content) as LessonMetaPayload | null;
  const progress = progressByLessonId[sql.id];

  const skill =
    (meta?.skill as LessonSuggestion["skill"] | undefined) ||
    // Back-compat if we ever stored skill in Description
    (sql.description as LessonSuggestion["skill"]) ||
    "Reading";

  return {
    id: sql.id,
    docId: sql.id,
    userId,
    topic: meta?.topic || sql.title,
    skill,
    level: toUserLevel(meta?.level ?? sql.level),
    status:
      (progress?.status as LessonStatus) ||
      (meta?.status as LessonStatus) ||
      "not-started",
    topicGroup: meta?.topicGroup || "General",
    createdAt: sql.createdAt ? new Date(sql.createdAt) : new Date(),
    content: meta?.content || [],
    exercises: meta?.exercises || {},
  };
};

// Helper function to recursively remove undefined properties from an object
const deepClean = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => deepClean(v)).filter((v) => v !== undefined);
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    return Object.fromEntries(
      Object.entries(obj)
        .map(([k, v]) => [k, deepClean(v)])
        .filter(([_, v]) => v !== undefined)
    );
  }
  return obj;
};

export const getLessons = async (userId: string): Promise<Lesson[]> => {
  if (!firebaseEnabled) {
    // SQL-backed mode
    const [lessons, progress] = await Promise.all([
      apiGet<SqlLesson[]>(`/api/lessons/author/${encodeURIComponent(userId)}`),
      apiGet<SqlUserLessonProgress[]>("/api/progress/me").catch(() => []),
    ]);

    const progressByLessonId = (progress || []).reduce((acc, p) => {
      acc[p.lessonId] = p;
      return acc;
    }, {} as Record<string, SqlUserLessonProgress>);

    return (lessons || [])
      .map((l) => mapSqlLessonToClient(l, userId, progressByLessonId))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  const q = query(
    lessonsCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      docId: doc.id,
      topic: data.topic,
      skill: data.skill,
      userId: data.userId,
      level: data.level,
      status: data.status || "not-started",
      topicGroup: data.topicGroup || "General",
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : data.createdAt,
      content: data.content || [],
      exercises: data.exercises || {},
    } as Lesson;
  });
};

export const addLesson = async (
  userId: string,
  lessonSuggestion: LessonSuggestion,
  topicGroup: string
): Promise<Lesson> => {
  if (!firebaseEnabled) {
    // SQL-backed mode
    const meta: LessonMetaPayload = {
      topic: lessonSuggestion.topic,
      skill: lessonSuggestion.skill,
      topicGroup,
      content: [],
      exercises: {},
    };

    const created = await apiPost<SqlLesson>("/api/lessons", {
      title: lessonSuggestion.topic,
      description: lessonSuggestion.skill,
      content: JSON.stringify(meta),
      level: lessonSuggestion.level,
      language: "en",
      isPublished: false,
    });

    // Initialize progress/status for this lesson for the current user
    await apiPost("/api/progress", {
      lessonId: created.id,
      status: "not-started",
      progress: 0,
    }).catch(() => {
      // Non-fatal: lesson exists even if progress row fails
    });

    return {
      ...lessonSuggestion,
      id: created.id,
      docId: created.id,
      userId,
      topicGroup,
      createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
      status: "not-started",
      content: [],
      exercises: {},
    };
  }

  const lessonData = {
    ...lessonSuggestion,
    userId,
    topicGroup,
    createdAt: Timestamp.now(),
    status: "not-started" as LessonStatus,
    content: [],
    exercises: {},
  };
  const docRef = await addDoc(lessonsCollection, lessonData);

  return {
    ...lessonData,
    id: docRef.id,
    docId: docRef.id,
    createdAt: new Date(), // Convert for immediate client use
  };
};

export const getLessonVocabulary = async (
  lessonId: string
): Promise<LessonVocabularyItem[]> => {
  if (!lessonId) return [];

  if (!firebaseEnabled) {
    const rows = await apiGet<any[]>(
      `/api/lessons/${encodeURIComponent(lessonId)}/vocabulary`
    );

    return (rows || [])
      .map((r) => ({
        id: (r.Id || r.id || "").toString(),
        term: (r.Word || r.term || "").toString(),
        definition: (r.Definition || r.definition || "").toString(),
        pronunciation: r.Pronunciation || r.pronunciation || undefined,
        partOfSpeech: r.PartOfSpeech || r.partOfSpeech || undefined,
      }))
      .filter((v) => !!v.id && !!v.term);
  }

  // Firebase mode doesn't currently support lesson->vocabulary links.
  return [];
};

export const getLessonStorybookSeed = async (
  lessonId: string
): Promise<LessonStorybookSeed | null> => {
  if (!lessonId) return null;

  if (firebaseEnabled) {
    // Firebase mode doesn't currently support fetching lesson content here.
    return null;
  }

  const sql = await apiGet<SqlLesson>(
    `/api/lessons/${encodeURIComponent(lessonId)}`
  );
  if (!sql) return null;

  const meta = safeJsonParse(sql.content) as LessonMetaPayload | null;
  const level = toUserLevel(meta?.level ?? sql.level);

  const vocabContent = (meta?.content || []).find(
    (c) => c.type === "vocabulary"
  )?.value;
  const suggestions = safeJsonParse(vocabContent) as Array<{
    word?: string;
    definition?: string;
  }> | null;

  const vocabulary = (suggestions || [])
    .map((s) => ({
      term: (s.word || "").toString().trim(),
      definition: (s.definition || "").toString().trim(),
    }))
    .filter((v) => !!v.term);

  return { level, vocabulary };
};

export const updateLessonContent = async (
  docId: string,
  content: LessonContent[],
  exercises?: Lesson["exercises"]
) => {
  if (!firebaseEnabled) {
    // SQL-backed mode: read current lesson first to avoid overwriting fields with null
    const current = await apiGet<SqlLesson>(
      `/api/lessons/${encodeURIComponent(docId)}`
    );
    const meta =
      (safeJsonParse(current.content) as LessonMetaPayload | null) || {};

    meta.content = content;
    if (exercises) meta.exercises = deepClean(exercises);

    await apiPut(`/api/lessons/${encodeURIComponent(docId)}`, {
      title: current.title,
      description: current.description,
      content: JSON.stringify(meta),
      level: current.level,
      language: current.language,
      isPublished: !!current.isPublished,
    });
    return;
  }
  if (!auth.currentUser) return;
  const lessonDoc = doc(db, "lessons", docId);
  const updates: Partial<Lesson> = { content };
  if (exercises) {
    updates.exercises = deepClean(exercises);
  }
  await updateDoc(lessonDoc, updates);
};

export const updateLesson = async (
  docId: string,
  updates: Partial<Pick<Lesson, "topic" | "level" | "status">>
) => {
  if (!firebaseEnabled) {
    // SQL-backed mode
    const current = await apiGet<SqlLesson>(
      `/api/lessons/${encodeURIComponent(docId)}`
    );
    const meta =
      (safeJsonParse(current.content) as LessonMetaPayload | null) || {};

    if (typeof updates.topic === "string") {
      meta.topic = updates.topic;
      current.title = updates.topic;
    }
    if (typeof updates.status === "string") {
      // Persist status in UserLessons table
      await apiPost("/api/progress", {
        lessonId: docId,
        status: updates.status,
      });
    }
    if (updates.level) {
      current.level = updates.level;
    }

    // Keep lesson row in sync (title/level/content)
    await apiPut(`/api/lessons/${encodeURIComponent(docId)}`, {
      title: current.title,
      description: current.description,
      content: JSON.stringify(meta),
      level: current.level,
      language: current.language,
      isPublished: !!current.isPublished,
    });
    return;
  }
  if (!auth.currentUser) return;
  const lessonDoc = doc(db, "lessons", docId);
  await updateDoc(lessonDoc, updates);
};

export const deleteLesson = async (docId: string) => {
  if (!firebaseEnabled) {
    // SQL-backed mode
    await apiDelete(`/api/lessons/${encodeURIComponent(docId)}`);
    await apiDelete(`/api/progress/${encodeURIComponent(docId)}`).catch(() => {
      // Ignore if progress row doesn't exist
    });
    return;
  }
  if (!auth.currentUser) return;
  const lessonDoc = doc(db, "lessons", docId);
  await deleteDoc(lessonDoc);
};
