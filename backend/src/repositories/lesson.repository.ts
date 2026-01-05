import { getPool } from "../db";

export interface Lesson {
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
}

export class LessonRepository {
  // Insert via sp_Lessons_Insert
  static async create(lesson: Lesson): Promise<Lesson> {
    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("Id", lesson.id)
      .input("Title", lesson.title)
      .input("Description", lesson.description || null)
      .input("Content", lesson.content || null)
      .input("Level", lesson.level || null)
      .input("Language", lesson.language || null)
      .input("AuthorId", lesson.authorId || null)
      .input("IsPublished", lesson.isPublished ? 1 : 0)
      .input("CreatedAt", now)
      .input("UpdatedAt", now)
      .execute("sp_Lessons_Insert");
    return {
      ...lesson,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  // Update via sp_Lessons_Update
  static async update(lesson: Partial<Lesson> & { id: string }): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", lesson.id)
      .input("Title", lesson.title || null)
      .input("Description", lesson.description || null)
      .input("Content", lesson.content || null)
      .input("Level", lesson.level || null)
      .input("Language", lesson.language || null)
      .input("IsPublished", lesson.isPublished ? 1 : 0)
      .input("UpdatedAt", new Date())
      .execute("sp_Lessons_Update");
  }

  // Delete via sp_Lessons_Delete
  static async delete(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).execute("sp_Lessons_Delete");
  }

  // Get by id via sp_Lessons_GetById
  static async findById(id: string): Promise<Lesson | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .execute("sp_Lessons_GetById");
    const r = res.recordset[0];
    if (!r) return null;
    return mapRow(r);
  }

  // Get all via sp_Lessons_GetAll
  static async findAll(): Promise<Lesson[]> {
    const pool = await getPool();
    const res = await pool.request().execute("sp_Lessons_GetAll");
    return res.recordset.map(mapRow);
  }

  // Get by author via sp_Lessons_GetByAuthor
  static async findByAuthor(authorId: string): Promise<Lesson[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("AuthorId", authorId)
      .execute("sp_Lessons_GetByAuthor");
    return res.recordset.map(mapRow);
  }

  // Link vocabulary via sp_LessonVocabulary_Insert
  static async addVocabulary(lessonId: string, vocabId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("LessonId", lessonId)
      .input("VocabId", vocabId)
      .execute("sp_LessonVocabulary_Insert");
  }

  // Unlink vocabulary via sp_LessonVocabulary_Delete
  static async removeVocabulary(
    lessonId: string,
    vocabId: string
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("LessonId", lessonId)
      .input("VocabId", vocabId)
      .execute("sp_LessonVocabulary_Delete");
  }

  // Get vocabulary for lesson via sp_LessonVocabulary_GetByLesson
  static async getVocabulary(lessonId: string): Promise<any[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("LessonId", lessonId)
      .execute("sp_LessonVocabulary_GetByLesson");
    return res.recordset;
  }
}

function mapRow(r: any): Lesson {
  return {
    id: r.Id,
    title: r.Title,
    description: r.Description,
    content: r.Content,
    level: r.Level,
    language: r.Language,
    authorId: r.AuthorId,
    isPublished: !!r.IsPublished,
    createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    updatedAt: r.UpdatedAt ? new Date(r.UpdatedAt).toISOString() : undefined,
  };
}
