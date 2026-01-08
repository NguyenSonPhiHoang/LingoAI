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
  writeBatch,
  getDoc,
  limit,
} from "firebase/firestore";
import type {
  VocabularyEntry,
  GenerateWordDetailsOutput,
} from "@/ai/flows/schemas";
import { generateWordDetails } from "@/ai/flows/generate-word-details";

// This is the base type, stored in the 'words' collection.
// It only contains the term and pronunciation, which are global.
export interface Word {
  id: string; // Document ID from 'words' collection
  term: string;
  term_normalized: string;
  pronunciation: string;
  createdAt: Timestamp;
  audioUrl?: string;
}

// This is the user-specific data, stored in 'userVocabulary'.
// It contains all AI-generated details and user-specific metadata.
export interface UserVocabulary {
  id: string; // Document ID from 'userVocabulary' collection
  userId: string;
  wordId: string; // Foreign key to the 'words' collection

  // AI-generated fields, specific to the user
  partOfSpeech: string;
  definition: string;
  vietnameseDefinition: string;
  sentence: string;
  vietnameseSentence: string;
  sentenceAudioUrl?: string;
  synonyms?: string[];
  antonyms?: string[];
  irregularForms?: { v1: string; v2: string; v3: string };
  wordForms?: {
    noun?: string;
    verb?: string;
    adjective?: string;
    adverb?: string;
  };

  // User-specific metadata
  favorite: boolean;
  // Learn counter (SQL backend). Optional for Firestore.
  learnCount?: number;
  topic?: string;
  createdAt: Timestamp;
}

// This is the combined, denormalized type used in the application UI.
export type CombinedVocabulary = Word &
  Omit<UserVocabulary, "id" | "wordId" | "userId" | "createdAt"> & {
    userVocabularyId: string;
  };

const wordsCollection = firebaseEnabled
  ? collection(db, "words")
  : (null as any);
const userVocabularyCollection = firebaseEnabled
  ? collection(db, "userVocabulary")
  : (null as any);

const toTimestamp = (value: any): Timestamp => {
  if (value instanceof Timestamp) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return Timestamp.fromDate(d);
  }
  return Timestamp.now();
};

// Some IPA characters can get mojibake'd when UTF-8 bytes are interpreted as latin1.
// Example: "ËˆmenjuË4" instead of "ˈmenjuː".
const normalizePronunciation = (value: any): string => {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return "";

  // Heuristic: common mojibake markers for IPA strings.
  if (!/[ÃÂË]/.test(s)) return s;

  try {
    const bytes = Uint8Array.from(
      Array.from(s),
      (ch) => ch.charCodeAt(0) & 0xff
    );
    const fixed = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    // Only accept if it looks more like IPA after fixing.
    if (fixed && fixed !== s && /[ˈˌːɑɒæəɛɜɪʊɔʌʃʒðθŋ]/.test(fixed))
      return fixed;
  } catch {
    // ignore
  }

  return s;
};

// Helper function to remove undefined/null properties from an object
const cleanObject = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const hasAnyOwnStringValue = (obj: unknown): boolean => {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj as Record<string, unknown>).some(isNonEmptyString);
};

// Normalize + fill missing AI fields so every add/import path produces a complete entry.
const ensureCompleteVocabularyPayload = async (
  input: VocabularyEntry & Partial<GenerateWordDetailsOutput>
): Promise<VocabularyEntry & Partial<GenerateWordDetailsOutput>> => {
  const term = String(input.term || "").trim();
  if (!term) return input;

  const pronunciation = (input as any).pronunciation;
  const partOfSpeech = (input as any).partOfSpeech;
  const definition = (input as any).definition;
  const vietnameseDefinition = (input as any).vietnameseDefinition;
  const sentence = (input as any).sentence;
  const vietnameseSentence = (input as any).vietnameseSentence;

  const missingCore =
    !isNonEmptyString(pronunciation) ||
    !isNonEmptyString(partOfSpeech) ||
    !isNonEmptyString(definition) ||
    !isNonEmptyString(vietnameseDefinition) ||
    !isNonEmptyString(sentence) ||
    !isNonEmptyString(vietnameseSentence);

  if (!missingCore) {
    return {
      ...input,
      term,
      synonyms: Array.isArray((input as any).synonyms)
        ? (input as any).synonyms
        : [],
      antonyms: Array.isArray((input as any).antonyms)
        ? (input as any).antonyms
        : [],
      irregularForms: (input as any).irregularForms || null,
      wordForms: (input as any).wordForms || null,
    } as any;
  }

  const generated = await generateWordDetails({ term });

  return {
    ...generated,
    ...input,
    term,
    pronunciation: isNonEmptyString((input as any).pronunciation)
      ? (input as any).pronunciation
      : generated.pronunciation,
    partOfSpeech: isNonEmptyString((input as any).partOfSpeech)
      ? (input as any).partOfSpeech
      : generated.partOfSpeech,
    definition: isNonEmptyString((input as any).definition)
      ? (input as any).definition
      : generated.definition,
    vietnameseDefinition: isNonEmptyString((input as any).vietnameseDefinition)
      ? (input as any).vietnameseDefinition
      : generated.vietnameseDefinition,
    sentence: isNonEmptyString((input as any).sentence)
      ? (input as any).sentence
      : generated.sentence,
    vietnameseSentence: isNonEmptyString((input as any).vietnameseSentence)
      ? (input as any).vietnameseSentence
      : generated.vietnameseSentence,
    synonyms:
      Array.isArray((input as any).synonyms) &&
      (input as any).synonyms.length > 0
        ? (input as any).synonyms
        : Array.isArray((generated as any).synonyms)
        ? (generated as any).synonyms
        : [],
    antonyms:
      Array.isArray((input as any).antonyms) &&
      (input as any).antonyms.length > 0
        ? (input as any).antonyms
        : Array.isArray((generated as any).antonyms)
        ? (generated as any).antonyms
        : [],
    irregularForms:
      (input as any).irregularForms ||
      (generated as any).irregularForms ||
      null,
    wordForms: hasAnyOwnStringValue((input as any).wordForms)
      ? (input as any).wordForms
      : (generated as any).wordForms || null,
  } as any;
};

// GET all of a user's vocabulary, combining data from both collections.
export const getVocabulary = async (
  userId: string
): Promise<CombinedVocabulary[]> => {
  if (!firebaseEnabled) {
    const rows = await apiGet<any[]>(`/api/user-vocabulary/me`);
    return (rows || []).map((r) => {
      const createdAt = toTimestamp(r.createdAt);
      return {
        id: r.id,
        userVocabularyId: r.userVocabularyId,
        term: r.term,
        term_normalized: r.term_normalized,
        pronunciation: normalizePronunciation(r.pronunciation),
        audioUrl: r.audioUrl || undefined,
        createdAt,
        partOfSpeech: r.partOfSpeech || "",
        definition: r.definition || "",
        vietnameseDefinition: r.vietnameseDefinition || "",
        sentence: r.sentence || "",
        vietnameseSentence: r.vietnameseSentence || "",
        sentenceAudioUrl: r.sentenceAudioUrl || undefined,
        learnCount:
          typeof r.learnCount === "number" && Number.isFinite(r.learnCount)
            ? r.learnCount
            : parseInt(r.learnCount, 10) || 0,
        synonyms: Array.isArray(r.synonyms) ? r.synonyms : [],
        antonyms: Array.isArray(r.antonyms) ? r.antonyms : [],
        irregularForms: r.irregularForms || null,
        wordForms: r.wordForms || null,
        favorite: !!r.favorite,
        topic: r.topic || undefined,
      } as CombinedVocabulary;
    });
  }

  const userVocabQuery = query(
    userVocabularyCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const userVocabSnapshot = await getDocs(userVocabQuery);

  if (userVocabSnapshot.empty) {
    return [];
  }

  const combinedVocabList: CombinedVocabulary[] = [];

  for (const userVocabDoc of userVocabSnapshot.docs) {
    const userVocabData = userVocabDoc.data() as UserVocabulary;

    if (userVocabData && userVocabData.wordId) {
      const wordDocRef = doc(db, "words", userVocabData.wordId);
      const wordDocSnap = await getDoc(wordDocRef);

      if (wordDocSnap.exists()) {
        const wordData = wordDocSnap.data() as Omit<Word, "id">;
        const { id: _ignoredId, ...userVocabRest } = userVocabData as any;
        combinedVocabList.push({
          ...wordData,
          id: wordDocSnap.id,
          ...userVocabRest,
          userVocabularyId: userVocabDoc.id,
          learnCount:
            typeof (userVocabData as any).learnCount === "number"
              ? (userVocabData as any).learnCount
              : 0,
        });
      }
    }
  }

  return combinedVocabList;
};

// GET all words from the global collection (for Admin)
export const getAllWords = async (): Promise<Word[]> => {
  if (!firebaseEnabled) {
    const rows = await apiGet<any[]>(`/api/words`);
    return (rows || []).map(
      (r) =>
        ({
          id: r.id,
          term: r.term,
          term_normalized: r.term_normalized,
          pronunciation: normalizePronunciation(r.pronunciation),
          audioUrl: r.audioUrl || undefined,
          createdAt: toTimestamp(r.createdAt),
        } as Word)
    );
  }

  const q = query(wordsCollection, orderBy("term_normalized", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...(doc.data() as any),
      } as Word)
  );
};

// ADD a new word. This function separates global data from user-specific data.
export const addWordToVocabulary = async (
  userId: string,
  fullWordData: VocabularyEntry & Partial<GenerateWordDetailsOutput>
): Promise<CombinedVocabulary> => {
  const completed = await ensureCompleteVocabularyPayload(fullWordData);
  if (!firebaseEnabled) {
    const saved = await apiPost<any>(`/api/user-vocabulary`, {
      term: completed.term,
      pronunciation: (completed as any).pronunciation,
      audioUrl: (completed as any).audioUrl,
      partOfSpeech: (completed as any).partOfSpeech,
      definition: (completed as any).definition,
      vietnameseDefinition: (completed as any).vietnameseDefinition,
      sentence: (completed as any).sentence,
      vietnameseSentence: (completed as any).vietnameseSentence,
      sentenceAudioUrl: (completed as any).sentenceAudioUrl,
      synonyms: (completed as any).synonyms,
      antonyms: (completed as any).antonyms,
      irregularForms: (completed as any).irregularForms,
      wordForms: (completed as any).wordForms,
      topic: (completed as any).topic,
    });

    return {
      id: saved.id,
      userVocabularyId: saved.userVocabularyId,
      term: saved.term,
      term_normalized: saved.term_normalized,
      pronunciation: normalizePronunciation(saved.pronunciation),
      audioUrl: saved.audioUrl || undefined,
      createdAt: toTimestamp(saved.createdAt),
      partOfSpeech: saved.partOfSpeech || "",
      definition: saved.definition || "",
      vietnameseDefinition: saved.vietnameseDefinition || "",
      sentence: saved.sentence || "",
      vietnameseSentence: saved.vietnameseSentence || "",
      sentenceAudioUrl: saved.sentenceAudioUrl || undefined,
      synonyms: Array.isArray(saved.synonyms) ? saved.synonyms : [],
      antonyms: Array.isArray(saved.antonyms) ? saved.antonyms : [],
      irregularForms: saved.irregularForms || null,
      wordForms: saved.wordForms || null,
      favorite: !!saved.favorite,
      topic: saved.topic || undefined,
    } as CombinedVocabulary;
  }

  const normalizedTerm = completed.term.toLowerCase();

  // 1. Check if the word exists in the global 'words' collection.
  const wordQuery = query(
    wordsCollection,
    where("term_normalized", "==", normalizedTerm),
    limit(1)
  );
  const wordSnap = await getDocs(wordQuery);

  let wordDocId: string;
  let wordDataForCombine: Word;

  if (wordSnap.empty) {
    // 2a. If word doesn't exist globally, create it with minimal data.
    const newWordPayload = {
      term: completed.term,
      pronunciation: (completed as any).pronunciation,
      term_normalized: normalizedTerm,
      createdAt: Timestamp.now(),
    };
    const wordDocRef = await addDoc(wordsCollection, newWordPayload);
    wordDocId = wordDocRef.id;
    wordDataForCombine = { ...newWordPayload, id: wordDocId };
  } else {
    // 2b. If word exists, use its ID.
    const doc = wordSnap.docs[0];
    wordDocId = doc.id;
    wordDataForCombine = { ...(doc.data() as any), id: doc.id } as Word;
  }

  // 3. Check if the user already has this word in their personal list.
  const userVocabQuery = query(
    userVocabularyCollection,
    where("userId", "==", userId),
    where("wordId", "==", wordDocId),
    limit(1)
  );
  const userVocabSnap = await getDocs(userVocabQuery);

  let userVocabDocRefId: string;

  // 4. Create or Update the user-specific vocabulary entry
  const userSpecificPayload = {
    userId,
    wordId: wordDocId,
    partOfSpeech: (completed as any).partOfSpeech,
    definition: (completed as any).definition,
    vietnameseDefinition: (completed as any).vietnameseDefinition,
    sentence: (completed as any).sentence,
    vietnameseSentence: (completed as any).vietnameseSentence,
    synonyms: (completed as any).synonyms || [],
    antonyms: (completed as any).antonyms || [],
    irregularForms: (completed as any).irregularForms || null,
    wordForms: (completed as any).wordForms || null,
  };

  if (userVocabSnap.empty) {
    // If user doesn't have it, create a new link in `userVocabulary`.
    const docRef = await addDoc(userVocabularyCollection, {
      ...userSpecificPayload,
      favorite: false,
      createdAt: Timestamp.now(),
    });
    userVocabDocRefId = docRef.id;
  } else {
    // If user already has it, update it with the new AI-generated details
    const userVocabDocToUpdateRef = userVocabSnap.docs[0].ref;
    await updateDoc(
      userVocabDocToUpdateRef,
      cleanObject(userSpecificPayload) as any
    );
    userVocabDocRefId = userVocabDocToUpdateRef.id;
  }

  const finalUserVocabSnap = await getDoc(
    doc(db, "userVocabulary", userVocabDocRefId)
  );
  const finalUserVocabData = finalUserVocabSnap.data() as UserVocabulary;

  // 5. Return the combined data for immediate UI update.
  return {
    ...wordDataForCombine,
    ...finalUserVocabData,
    userVocabularyId: userVocabDocRefId,
  };
};

export const addMultipleWordsToVocabulary = async (
  words: (VocabularyEntry & Partial<GenerateWordDetailsOutput>)[],
  userId: string
): Promise<CombinedVocabulary[]> => {
  if (!firebaseEnabled) {
    const completedWords: (VocabularyEntry &
      Partial<GenerateWordDetailsOutput>)[] = [];
    for (const w of words) {
      completedWords.push(await ensureCompleteVocabularyPayload(w));
    }
    const saved = await apiPost<any[]>(`/api/user-vocabulary/bulk`, {
      words: completedWords,
    });
    return (saved || []).map(
      (r) =>
        ({
          id: r.id,
          userVocabularyId: r.userVocabularyId,
          term: r.term,
          term_normalized: r.term_normalized,
          pronunciation: normalizePronunciation(r.pronunciation),
          audioUrl: r.audioUrl || undefined,
          createdAt: toTimestamp(r.createdAt),
          partOfSpeech: r.partOfSpeech || "",
          definition: r.definition || "",
          vietnameseDefinition: r.vietnameseDefinition || "",
          sentence: r.sentence || "",
          vietnameseSentence: r.vietnameseSentence || "",
          sentenceAudioUrl: r.sentenceAudioUrl || undefined,
          synonyms: Array.isArray(r.synonyms) ? r.synonyms : [],
          antonyms: Array.isArray(r.antonyms) ? r.antonyms : [],
          irregularForms: r.irregularForms || null,
          wordForms: r.wordForms || null,
          favorite: !!r.favorite,
          topic: r.topic || undefined,
        } as CombinedVocabulary)
    );
  }

  const addedOrUpdatedWords: CombinedVocabulary[] = [];
  for (const word of words) {
    const savedWord = await addWordToVocabulary(userId, word);
    addedOrUpdatedWords.push(savedWord);
  }
  return addedOrUpdatedWords;
};

// Deletes the entry from the user's personal list, not the global word.
export const deleteUserVocabulary = async (userVocabularyId: string) => {
  if (!firebaseEnabled) {
    await apiDelete(`/api/user-vocabulary/${userVocabularyId}`);
    return;
  }
  if (!auth.currentUser) return;
  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  await deleteDoc(userVocabDoc);
};

// Updates fields in the `userVocabulary` collection.
export const updateUserVocabulary = async (
  userVocabularyId: string,
  updates: Partial<
    Omit<UserVocabulary, "id" | "wordId" | "userId" | "createdAt">
  >
) => {
  if (!firebaseEnabled) {
    const cleanUpdates = cleanObject(updates);
    if (Object.keys(cleanUpdates).length > 0) {
      await apiPut(`/api/user-vocabulary/${userVocabularyId}`, cleanUpdates);
    }
    return;
  }
  if (!auth.currentUser) return;

  const userVocabDoc = doc(db, "userVocabulary", userVocabularyId);
  const cleanUpdates = cleanObject(updates);
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(userVocabDoc, cleanUpdates as any);
  }
};

// Updates fields in the global `words` collection (for Admin).
export const updateWord = async (
  wordId: string,
  updates: Partial<Pick<Word, "term" | "pronunciation" | "audioUrl">>
) => {
  if (!firebaseEnabled) {
    const cleanUpdates = cleanObject({
      ...updates,
      term_normalized: updates.term?.toLowerCase(),
    });
    if (Object.keys(cleanUpdates).length > 0) {
      await apiPut(`/api/words/${wordId}`, cleanUpdates);
    }
    return;
  }
  if (!auth.currentUser) return;

  const wordDoc = doc(db, "words", wordId);
  const cleanUpdates = cleanObject({
    ...updates,
    term_normalized: updates.term?.toLowerCase(),
  });
  if (Object.keys(cleanUpdates).length > 0) {
    await updateDoc(wordDoc, cleanUpdates as any);
  }
};

// Increment learn count for a user-vocabulary entry (SQL mode only).
// Backend policy: if LearnCount exceeds 20, Favorite is forced to false.
export const incrementUserVocabularyLearnCount = async (
  userVocabularyId: string
): Promise<{ learnCount: number; favorite: boolean } | null> => {
  if (firebaseEnabled) return null;
  return await apiPost<{ learnCount: number; favorite: boolean }>(
    `/api/user-vocabulary/${userVocabularyId}/learn`,
    {}
  );
};
