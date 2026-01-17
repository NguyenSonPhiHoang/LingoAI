import { getPool } from "../db";

export interface Storybook {
  id: string;
  title: string;
  description?: string | null;
  language?: string | null;
  authorId?: string | null;
  level?: string | null;
  format?: string | null;
  status?: string | null;
  keyVocabulary?: any[] | null;
  englishStory?: string | null;
  vietnameseStory?: string | null;
  interspersedStory?: string | null;
  fullEnglishStory?: string | null;
  titleAudioUrl?: string | null;
  englishContentAudioUrl?: string | null;
  vietnameseContentAudioUrl?: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StorybookPage {
  id: string;
  storybookId: string;
  pageNumber: number;
  content?: string | null;
  audioUrl?: string | null;
}

export class StorybookRepository {
  // Insert via sp_Storybooks_Insert
  static async create(sb: Storybook): Promise<Storybook> {
    const pool = await getPool();
    const now = new Date();
    const keyVocabularyJson =
      sb.keyVocabulary !== undefined && sb.keyVocabulary !== null
        ? JSON.stringify(sb.keyVocabulary)
        : null;
    await pool
      .request()
      .input("Id", sb.id)
      .input("Title", sb.title)
      .input("Description", sb.description || null)
      .input("Language", sb.language || null)
      .input("AuthorId", sb.authorId || null)
      .input("Level", sb.level || null)
      .input("Format", sb.format || null)
      .input("Status", sb.status || null)
      .input("KeyVocabulary", keyVocabularyJson)
      .input("EnglishStory", sb.englishStory || null)
      .input("VietnameseStory", sb.vietnameseStory || null)
      .input("InterspersedStory", sb.interspersedStory || null)
      .input("FullEnglishStory", sb.fullEnglishStory || null)
      .input("TitleAudioUrl", sb.titleAudioUrl || null)
      .input("EnglishContentAudioUrl", sb.englishContentAudioUrl || null)
      .input("VietnameseContentAudioUrl", sb.vietnameseContentAudioUrl || null)
      .input("IsPublished", sb.isPublished ? 1 : 0)
      .input("CreatedAt", now)
      .input("UpdatedAt", now)
      .execute("sp_Storybooks_Insert");
    return {
      ...sb,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  // Update via sp_Storybooks_Update
  static async update(
    sb: Partial<Storybook> & { id: string; authorId?: string | null }
  ): Promise<void> {
    const pool = await getPool();
    const keyVocabularyJson =
      sb.keyVocabulary !== undefined && sb.keyVocabulary !== null
        ? JSON.stringify(sb.keyVocabulary)
        : null;
    await pool
      .request()
      .input("Id", sb.id)
      .input("Title", sb.title ?? null)
      .input("Description", sb.description ?? null)
      .input("Language", sb.language ?? null)
      .input("Level", sb.level ?? null)
      .input("Format", sb.format ?? null)
      .input("Status", sb.status ?? null)
      .input("KeyVocabulary", keyVocabularyJson)
      .input("EnglishStory", sb.englishStory ?? null)
      .input("VietnameseStory", sb.vietnameseStory ?? null)
      .input("InterspersedStory", sb.interspersedStory ?? null)
      .input("FullEnglishStory", sb.fullEnglishStory ?? null)
      .input("TitleAudioUrl", sb.titleAudioUrl ?? null)
      .input("EnglishContentAudioUrl", sb.englishContentAudioUrl ?? null)
      .input("VietnameseContentAudioUrl", sb.vietnameseContentAudioUrl ?? null)
      .input(
        "IsPublished",
        sb.isPublished === undefined || sb.isPublished === null
          ? null
          : sb.isPublished
          ? 1
          : 0
      )
      .input("AuthorId", sb.authorId ?? null)
      .input("UpdatedAt", new Date())
      .execute("sp_Storybooks_Update");
  }

  // Delete via sp_Storybooks_Delete
  static async delete(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).execute("sp_Storybooks_Delete");
  }

  // Get by id via sp_Storybooks_GetById
  static async findById(id: string): Promise<Storybook | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .execute("sp_Storybooks_GetById");
    const r = res.recordset[0];
    if (!r) return null;
    return mapSb(r);
  }

  // Get all via sp_Storybooks_GetAll
  static async findAll(): Promise<Storybook[]> {
    const pool = await getPool();
    const res = await pool.request().execute("sp_Storybooks_GetAll");
    return res.recordset.map(mapSb);
  }

  // List by author via sp_Storybooks_ListByAuthor
  static async findByAuthor(authorId: string): Promise<Storybook[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("AuthorId", authorId)
      .execute("sp_Storybooks_ListByAuthor");
    return res.recordset.map(mapSb);
  }

  static async findByLessonForAuthor(
    authorId: string,
    lessonId: string
  ): Promise<Storybook[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("AuthorId", authorId)
      .input("LessonId", lessonId)
      .query(
        `
        SELECT sb.*
        FROM Storybooks sb
          INNER JOIN StorybookLessons sl ON sl.StorybookId = sb.Id
        WHERE sl.LessonId = @LessonId
          AND sb.AuthorId = @AuthorId
        ORDER BY sb.CreatedAt DESC
        `
      );

    return res.recordset.map(mapSb);
  }

  // ========== LESSON LINKS ==========

  static async linkToLesson(
    storybookId: string,
    lessonId: string
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("StorybookId", storybookId)
      .input("LessonId", lessonId)
      .query(
        `
        IF NOT EXISTS (
          SELECT 1
          FROM StorybookLessons
          WHERE StorybookId = @StorybookId AND LessonId = @LessonId
        )
        BEGIN
          INSERT INTO StorybookLessons (StorybookId, LessonId)
          VALUES (@StorybookId, @LessonId);
        END
        `
      );
  }

  // ========== PAGES ==========

  // Insert page via sp_StorybookPages_Insert
  static async createPage(page: StorybookPage): Promise<StorybookPage> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", page.id)
      .input("StorybookId", page.storybookId)
      .input("PageNumber", page.pageNumber)
      .input("Content", page.content || null)
      .input("AudioUrl", page.audioUrl || null)
      .execute("sp_StorybookPages_Insert");
    return page;
  }

  // Update page via sp_StorybookPages_Update
  static async updatePage(
    page: Partial<StorybookPage> & { id: string }
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", page.id)
      .input("PageNumber", page.pageNumber || 0)
      .input("Content", page.content || null)
      .input("AudioUrl", page.audioUrl || null)
      .execute("sp_StorybookPages_Update");
  }

  // Delete page via sp_StorybookPages_Delete
  static async deletePage(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).execute("sp_StorybookPages_Delete");
  }

  // Get pages via sp_StorybookPages_GetByStorybook
  static async getPages(storybookId: string): Promise<StorybookPage[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("StorybookId", storybookId)
      .execute("sp_StorybookPages_GetByStorybook");
    return res.recordset.map((r: any) => ({
      id: r.Id,
      storybookId: r.StorybookId,
      pageNumber: r.PageNumber,
      content: r.Content,
      audioUrl: r.AudioUrl,
    }));
  }
}

function mapSb(r: any): Storybook {
  return {
    id: r.Id,
    title: r.Title,
    description: r.Description,
    language: r.Language,
    authorId: r.AuthorId,
    level: r.Level,
    format: r.Format,
    status: r.Status,
    keyVocabulary: safeParseJsonArray(r.KeyVocabulary),
    englishStory: r.EnglishStory,
    vietnameseStory: r.VietnameseStory,
    interspersedStory: r.InterspersedStory,
    fullEnglishStory: r.FullEnglishStory,
    titleAudioUrl: r.TitleAudioUrl,
    englishContentAudioUrl: r.EnglishContentAudioUrl,
    vietnameseContentAudioUrl: r.VietnameseContentAudioUrl,
    isPublished: !!r.IsPublished,
    createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    updatedAt: r.UpdatedAt ? new Date(r.UpdatedAt).toISOString() : undefined,
  };
}

function safeParseJsonArray(value: any): any[] | null {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
