import { getPool } from "../db";

export interface WordRecord {
  id: string;
  term: string;
  term_normalized: string;
  pronunciation: string | null;
  audioUrl: string | null;
  createdAt?: string;
}

function mapRow(r: any): WordRecord {
  return {
    id: r.Id,
    term: r.Term,
    term_normalized: r.TermNormalized,
    pronunciation: r.Pronunciation ?? null,
    audioUrl: r.AudioUrl ?? null,
    createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
  };
}

export class WordRepository {
  static async findByNormalized(
    termNormalized: string
  ): Promise<WordRecord | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("TermNormalized", termNormalized)
      .execute("sp_Words_GetByNormalized");
    const r = res.recordset?.[0];
    return r ? mapRow(r) : null;
  }

  static async findById(id: string): Promise<WordRecord | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .execute("sp_Words_GetById");
    const r = res.recordset?.[0];
    return r ? mapRow(r) : null;
  }

  static async create(word: {
    id: string;
    term: string;
    term_normalized: string;
    pronunciation?: string | null;
    audioUrl?: string | null;
  }): Promise<WordRecord> {
    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("Id", word.id)
      .input("Term", word.term)
      .input("TermNormalized", word.term_normalized)
      .input("Pronunciation", word.pronunciation ?? null)
      .input("AudioUrl", word.audioUrl ?? null)
      .input("CreatedAt", now)
      .execute("sp_Words_Insert");

    return {
      id: word.id,
      term: word.term,
      term_normalized: word.term_normalized,
      pronunciation: word.pronunciation ?? null,
      audioUrl: word.audioUrl ?? null,
      createdAt: now.toISOString(),
    };
  }

  static async update(word: {
    id: string;
    term?: string | null;
    term_normalized?: string | null;
    pronunciation?: string | null;
    audioUrl?: string | null;
  }): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", word.id)
      .input("Term", word.term ?? null)
      .input("TermNormalized", word.term_normalized ?? null)
      .input("Pronunciation", word.pronunciation ?? null)
      .input("AudioUrl", word.audioUrl ?? null)
      .execute("sp_Words_Update");
  }

  static async findAll(): Promise<WordRecord[]> {
    const pool = await getPool();
    const res = await pool.request().execute("sp_Words_GetAll");
    return (res.recordset || []).map(mapRow);
  }
}
