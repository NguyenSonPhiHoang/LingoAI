import { getPool } from "../db";

export interface UserVocabularyUpsertInput {
  id: string;
  userId: string;
  wordId: string;

  partOfSpeech?: string | null;
  definition?: string | null;
  vietnameseDefinition?: string | null;
  sentence?: string | null;
  vietnameseSentence?: string | null;
  sentenceAudioUrl?: string | null;
  synonyms?: string[] | null;
  antonyms?: string[] | null;
  irregularForms?: { v1?: string; v2?: string; v3?: string } | null;
  wordForms?: any | null;

  favorite?: boolean | null;
  topic?: string | null;
}

export interface CombinedVocabularyRecord {
  id: string; // word id
  term: string;
  term_normalized: string;
  pronunciation: string | null;
  audioUrl: string | null;

  userVocabularyId: string;
  partOfSpeech: string | null;
  definition: string | null;
  vietnameseDefinition: string | null;
  sentence: string | null;
  vietnameseSentence: string | null;
  sentenceAudioUrl: string | null;
  learnCount: number;
  synonyms: string[];
  antonyms: string[];
  irregularForms: any | null;
  wordForms: any | null;
  favorite: boolean;
  topic: string | null;

  createdAt?: string;
}

function safeParseJson<T>(value: any, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRow(r: any): CombinedVocabularyRecord {
  const synonyms = safeParseJson<string[]>(r.Synonyms, []);
  const antonyms = safeParseJson<string[]>(r.Antonyms, []);
  const irregularForms = safeParseJson<any>(r.IrregularForms, null);
  const wordForms = safeParseJson<any>(r.WordForms, null);

  return {
    id: r.WordId,
    term: r.Term,
    term_normalized: r.TermNormalized,
    pronunciation: r.Pronunciation ?? null,
    audioUrl: r.AudioUrl ?? null,

    userVocabularyId: r.UserVocabularyId,
    partOfSpeech: r.PartOfSpeech ?? null,
    definition: r.Definition ?? null,
    vietnameseDefinition: r.VietnameseDefinition ?? null,
    sentence: r.Sentence ?? null,
    vietnameseSentence: r.VietnameseSentence ?? null,
    sentenceAudioUrl: r.SentenceAudioUrl ?? null,
    learnCount:
      typeof r.LearnCount === "number" && Number.isFinite(r.LearnCount)
        ? r.LearnCount
        : parseInt(r.LearnCount, 10) || 0,
    synonyms,
    antonyms,
    irregularForms,
    wordForms,
    favorite: typeof r.Favorite === "boolean" ? r.Favorite : r.Favorite === 1,
    topic: r.Topic ?? null,

    // Match Firestore behavior: createdAt is from the user-vocabulary row
    createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
  };
}

export class UserVocabularyRepository {
  static async listByUser(userId: string): Promise<CombinedVocabularyRecord[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("UserId", userId)
      .execute("sp_UserVocabulary_ListByUser");
    return (res.recordset || []).map(mapRow);
  }

  static async getById(
    id: string,
    userId: string
  ): Promise<CombinedVocabularyRecord | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .execute("sp_UserVocabulary_GetById");
    const r = res.recordset?.[0];
    return r ? mapRow(r) : null;
  }

  static async upsert(input: UserVocabularyUpsertInput): Promise<string> {
    const pool = await getPool();
    const now = new Date();

    const synonymsJson =
      input.synonyms === undefined || input.synonyms === null
        ? null
        : JSON.stringify(input.synonyms);
    const antonymsJson =
      input.antonyms === undefined || input.antonyms === null
        ? null
        : JSON.stringify(input.antonyms);
    const irregularFormsJson =
      input.irregularForms === undefined || input.irregularForms === null
        ? null
        : JSON.stringify(input.irregularForms);
    const wordFormsJson =
      input.wordForms === undefined || input.wordForms === null
        ? null
        : JSON.stringify(input.wordForms);

    const res = await pool
      .request()
      .input("Id", input.id)
      .input("UserId", input.userId)
      .input("WordId", input.wordId)
      .input("PartOfSpeech", input.partOfSpeech ?? null)
      .input("Definition", input.definition ?? null)
      .input("VietnameseDefinition", input.vietnameseDefinition ?? null)
      .input("Sentence", input.sentence ?? null)
      .input("VietnameseSentence", input.vietnameseSentence ?? null)
      .input("SentenceAudioUrl", input.sentenceAudioUrl ?? null)
      .input("Synonyms", synonymsJson)
      .input("Antonyms", antonymsJson)
      .input("IrregularForms", irregularFormsJson)
      .input("WordForms", wordFormsJson)
      .input(
        "Favorite",
        input.favorite === undefined || input.favorite === null
          ? null
          : input.favorite
          ? 1
          : 0
      )
      .input("Topic", input.topic ?? null)
      .input("CreatedAt", now)
      .input("UpdatedAt", now)
      .execute("sp_UserVocabulary_Upsert");

    const row = res.recordset?.[0];
    return row?.Id || input.id;
  }

  static async update(
    id: string,
    userId: string,
    updates: Omit<UserVocabularyUpsertInput, "id" | "userId" | "wordId"> & {
      favorite?: boolean | null;
      topic?: string | null;
    }
  ): Promise<void> {
    const pool = await getPool();
    const now = new Date();

    const synonymsJson =
      updates.synonyms === undefined || updates.synonyms === null
        ? null
        : JSON.stringify(updates.synonyms);
    const antonymsJson =
      updates.antonyms === undefined || updates.antonyms === null
        ? null
        : JSON.stringify(updates.antonyms);
    const irregularFormsJson =
      updates.irregularForms === undefined || updates.irregularForms === null
        ? null
        : JSON.stringify(updates.irregularForms);
    const wordFormsJson =
      updates.wordForms === undefined || updates.wordForms === null
        ? null
        : JSON.stringify(updates.wordForms);

    await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .input("PartOfSpeech", updates.partOfSpeech ?? null)
      .input("Definition", updates.definition ?? null)
      .input("VietnameseDefinition", updates.vietnameseDefinition ?? null)
      .input("Sentence", updates.sentence ?? null)
      .input("VietnameseSentence", updates.vietnameseSentence ?? null)
      .input("SentenceAudioUrl", updates.sentenceAudioUrl ?? null)
      .input("Synonyms", synonymsJson)
      .input("Antonyms", antonymsJson)
      .input("IrregularForms", irregularFormsJson)
      .input("WordForms", wordFormsJson)
      .input(
        "Favorite",
        updates.favorite === undefined || updates.favorite === null
          ? null
          : updates.favorite
          ? 1
          : 0
      )
      .input("Topic", updates.topic ?? null)
      .input("UpdatedAt", now)
      .execute("sp_UserVocabulary_Update");
  }

  static async delete(id: string, userId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .execute("sp_UserVocabulary_Delete");
  }

  static async incrementLearnCount(
    id: string,
    userId: string
  ): Promise<{ learnCount: number; favorite: boolean } | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .execute("sp_UserVocabulary_IncrementLearnCount");

    const row = res.recordset?.[0];
    if (!row) return null;

    const learnCount =
      typeof row.LearnCount === "number" && Number.isFinite(row.LearnCount)
        ? row.LearnCount
        : parseInt(row.LearnCount, 10) || 0;
    const favorite =
      typeof row.Favorite === "boolean" ? row.Favorite : row.Favorite === 1;

    return { learnCount, favorite };
  }
}
