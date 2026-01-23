import { getPool } from "../db";

let isNotePageColumnCached: boolean | null = null;

async function hasIsNotePageColumn(): Promise<boolean> {
  if (isNotePageColumnCached !== null) return isNotePageColumnCached;

  const pool = await getPool();
  const res = await pool.request().query(
    `SELECT CASE
        WHEN COL_LENGTH('dbo.LibraryContents', 'IsNotePage') IS NULL THEN 0
        ELSE 1
      END AS HasCol`
  );
  const hasCol = res.recordset && res.recordset[0]?.HasCol ? true : false;
  isNotePageColumnCached = hasCol;
  return hasCol;
}

export type LibrarySkill =
  | "Reading"
  | "Writing"
  | "Listening"
  | "Speaking"
  | "Pronunciation";

export interface LibraryDocument {
  id: string;
  userId: string;
  skill: LibrarySkill;
  title: string;
  url: string | null;
  summary?: string | null;
  contentText?: string | null;
  sourceType?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type LibraryContentType = "markdown" | "image";

export interface LibraryContent {
  id: string;
  docId: string;
  userId: string;
  fileName: string;
  type: LibraryContentType;
  content: string;
  isNotePage?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function toIso(val: any): string | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function mapDocRow(r: any): LibraryDocument {
  return {
    id: r.Id,
    userId: r.UserId,
    skill: r.Skill,
    title: r.Title,
    url: r.Url ?? null,
    summary: r.Summary ?? null,
    contentText: r.ContentText ?? null,
    sourceType: r.SourceType ?? null,
    createdAt: toIso(r.CreatedAt),
    updatedAt: toIso(r.UpdatedAt),
  };
}

function mapContentRow(r: any): LibraryContent {
  return {
    id: r.Id,
    docId: r.DocId,
    userId: r.UserId,
    fileName: r.FileName,
    type: r.Type,
    content: r.Content,
    isNotePage: r.IsNotePage === true || r.IsNotePage === 1,
    createdAt: toIso(r.CreatedAt),
    updatedAt: toIso(r.UpdatedAt),
  };
}

export class LibraryRepository {
  static async isNotePageSupported(): Promise<boolean> {
    return hasIsNotePageColumn();
  }

  static async listDocumentsByUser(userId: string): Promise<LibraryDocument[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("UserId", userId)
      .query(
        `SELECT Id, UserId, Skill, Title, Url, Summary, ContentText, SourceType, CreatedAt, UpdatedAt
         FROM dbo.LibraryDocuments
         WHERE UserId = @UserId
         ORDER BY CreatedAt DESC`
      );
    return (res.recordset || []).map(mapDocRow);
  }

  static async getDocumentById(
    id: string,
    userId: string
  ): Promise<LibraryDocument | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .query(
        `SELECT TOP 1 Id, UserId, Skill, Title, Url, Summary, ContentText, SourceType, CreatedAt, UpdatedAt
         FROM dbo.LibraryDocuments
         WHERE Id = @Id AND UserId = @UserId`
      );
    const row = res.recordset && res.recordset[0];
    return row ? mapDocRow(row) : null;
  }

  static async createDocument(doc: {
    id: string;
    userId: string;
    skill: LibrarySkill;
    title: string;
    url?: string | null;
    summary?: string | null;
    contentText?: string | null;
    sourceType?: string | null;
  }): Promise<LibraryDocument> {
    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("Id", doc.id)
      .input("UserId", doc.userId)
      .input("Skill", doc.skill)
      .input("Title", doc.title)
      .input("Url", doc.url ?? null)
      .input("Summary", doc.summary ?? null)
      .input("ContentText", doc.contentText ?? null)
      .input("SourceType", doc.sourceType ?? null)
      .input("CreatedAt", now)
      .input("UpdatedAt", now)
      .query(
        `INSERT INTO dbo.LibraryDocuments (Id, UserId, Skill, Title, Url, Summary, ContentText, SourceType, CreatedAt, UpdatedAt)
         VALUES (@Id, @UserId, @Skill, @Title, @Url, @Summary, @ContentText, @SourceType, @CreatedAt, @UpdatedAt)`
      );

    return {
      id: doc.id,
      userId: doc.userId,
      skill: doc.skill,
      title: doc.title,
      url: doc.url ?? null,
      summary: doc.summary ?? null,
      contentText: doc.contentText ?? null,
      sourceType: doc.sourceType ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  static async updateDocument(
    id: string,
    userId: string,
    updates: Partial<{
      skill: LibrarySkill;
      title: string;
      url: string | null;
      summary: string | null;
      contentText: string | null;
      sourceType: string | null;
    }>
  ): Promise<LibraryDocument | null> {
    const existing = await this.getDocumentById(id, userId);
    if (!existing) return null;

    const next: LibraryDocument = {
      ...existing,
      skill: (updates.skill ?? existing.skill) as LibrarySkill,
      title: updates.title ?? existing.title,
      url:
        updates.url === undefined ? existing.url ?? null : updates.url ?? null,
      summary:
        updates.summary === undefined
          ? existing.summary ?? null
          : updates.summary ?? null,
      contentText:
        updates.contentText === undefined
          ? existing.contentText ?? null
          : updates.contentText ?? null,
      sourceType:
        updates.sourceType === undefined
          ? existing.sourceType ?? null
          : updates.sourceType ?? null,
    };

    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .input("Skill", next.skill)
      .input("Title", next.title)
      .input("Url", next.url)
      .input("Summary", next.summary ?? null)
      .input("ContentText", next.contentText ?? null)
      .input("SourceType", next.sourceType ?? null)
      .input("UpdatedAt", now)
      .query(
        `UPDATE dbo.LibraryDocuments
         SET Skill=@Skill, Title=@Title, Url=@Url, Summary=@Summary, ContentText=@ContentText, SourceType=@SourceType, UpdatedAt=@UpdatedAt
         WHERE Id=@Id AND UserId=@UserId`
      );

    return {
      ...next,
      updatedAt: now.toISOString(),
    };
  }

  static async deleteDocument(id: string, userId: string): Promise<void> {
    const pool = await getPool();
    // Delete contents first (if any)
    await pool
      .request()
      .input("DocId", id)
      .input("UserId", userId)
      .query(
        `DELETE FROM dbo.LibraryContents WHERE DocId=@DocId AND UserId=@UserId`
      );

    await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .query(
        `DELETE FROM dbo.LibraryDocuments WHERE Id=@Id AND UserId=@UserId`
      );
  }

  static async listContentsForDocument(
    docId: string,
    userId: string
  ): Promise<LibraryContent[]> {
    const hasCol = await hasIsNotePageColumn();
    const pool = await getPool();
    const res = await pool
      .request()
      .input("DocId", docId)
      .input("UserId", userId)
      .query(
        hasCol
          ? `SELECT Id, DocId, UserId, FileName, Type, Content, IsNotePage, CreatedAt, UpdatedAt
             FROM dbo.LibraryContents
             WHERE DocId=@DocId AND UserId=@UserId AND IsNotePage = 0
             ORDER BY CreatedAt DESC`
          : `SELECT Id, DocId, UserId, FileName, Type, Content, CreatedAt, UpdatedAt
             FROM dbo.LibraryContents
             WHERE DocId=@DocId AND UserId=@UserId
             ORDER BY CreatedAt DESC`
      );
    return (res.recordset || []).map(mapContentRow);
  }

  static async getNotePageForDocument(
    docId: string,
    userId: string
  ): Promise<LibraryContent | null> {
    const hasCol = await hasIsNotePageColumn();
    if (!hasCol) return null;

    const pool = await getPool();
    const res = await pool
      .request()
      .input("DocId", docId)
      .input("UserId", userId)
      .query(
        `SELECT TOP 1 Id, DocId, UserId, FileName, Type, Content, IsNotePage, CreatedAt, UpdatedAt
         FROM dbo.LibraryContents
         WHERE DocId=@DocId AND UserId=@UserId AND IsNotePage = 1`
      );
    const row = res.recordset && res.recordset[0];
    return row ? mapContentRow(row) : null;
  }

  static async getContentById(
    contentId: string,
    userId: string
  ): Promise<LibraryContent | null> {
    const hasCol = await hasIsNotePageColumn();
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", contentId)
      .input("UserId", userId)
      .query(
        hasCol
          ? `SELECT TOP 1 Id, DocId, UserId, FileName, Type, Content, IsNotePage, CreatedAt, UpdatedAt
             FROM dbo.LibraryContents
             WHERE Id=@Id AND UserId=@UserId`
          : `SELECT TOP 1 Id, DocId, UserId, FileName, Type, Content, CreatedAt, UpdatedAt
             FROM dbo.LibraryContents
             WHERE Id=@Id AND UserId=@UserId`
      );
    const row = res.recordset && res.recordset[0];
    return row ? mapContentRow(row) : null;
  }

  static async createContent(content: {
    id: string;
    docId: string;
    userId: string;
    fileName: string;
    type: LibraryContentType;
    content: string;
    isNotePage?: boolean;
  }): Promise<LibraryContent> {
    const hasCol = await hasIsNotePageColumn();
    const pool = await getPool();
    const now = new Date();
    const req = pool
      .request()
      .input("Id", content.id)
      .input("DocId", content.docId)
      .input("UserId", content.userId)
      .input("FileName", content.fileName)
      .input("Type", content.type)
      .input("Content", content.content)
      .input("CreatedAt", now)
      .input("UpdatedAt", now);

    if (hasCol) {
      req.input("IsNotePage", content.isNotePage ? 1 : 0);
      await req.query(
        `INSERT INTO dbo.LibraryContents (Id, DocId, UserId, FileName, Type, Content, IsNotePage, CreatedAt, UpdatedAt)
         VALUES (@Id, @DocId, @UserId, @FileName, @Type, @Content, @IsNotePage, @CreatedAt, @UpdatedAt)`
      );
    } else {
      await req.query(
        `INSERT INTO dbo.LibraryContents (Id, DocId, UserId, FileName, Type, Content, CreatedAt, UpdatedAt)
         VALUES (@Id, @DocId, @UserId, @FileName, @Type, @Content, @CreatedAt, @UpdatedAt)`
      );
    }

    return {
      id: content.id,
      docId: content.docId,
      userId: content.userId,
      fileName: content.fileName,
      type: content.type,
      content: content.content,
      isNotePage: hasCol ? !!content.isNotePage : false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  static async updateContent(
    contentId: string,
    userId: string,
    updates: Partial<{ fileName: string; content: string }>
  ): Promise<LibraryContent | null> {
    const existing = await this.getContentById(contentId, userId);
    if (!existing) return null;

    const next: LibraryContent = {
      ...existing,
      fileName: updates.fileName ?? existing.fileName,
      content: updates.content ?? existing.content,
    };

    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("Id", contentId)
      .input("UserId", userId)
      .input("FileName", next.fileName)
      .input("Content", next.content)
      .input("UpdatedAt", now)
      .query(
        `UPDATE dbo.LibraryContents
         SET FileName=@FileName, Content=@Content, UpdatedAt=@UpdatedAt
         WHERE Id=@Id AND UserId=@UserId`
      );

    return { ...next, updatedAt: now.toISOString() };
  }

  static async deleteContent(contentId: string, userId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", contentId)
      .input("UserId", userId)
      .query(`DELETE FROM dbo.LibraryContents WHERE Id=@Id AND UserId=@UserId`);
  }
}

export default LibraryRepository;
