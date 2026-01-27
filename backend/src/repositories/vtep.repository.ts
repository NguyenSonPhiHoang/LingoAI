import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";

export class VtepRepository {
  static async createDocument(input: {
    title?: string | null;
    description?: string | null;
    fileName: string;
    filePath: string;
    pageCount?: number | null;
    tocJson?: any;
    createdByUserId?: string | null;
  }) {
    const pool = await getPool();
    const id = uuidv4();
    await pool
      .request()
      .input("Id", id)
      .input("Title", input.title || null)
      .input("Description", input.description || null)
      .input("FileName", input.fileName)
      .input("FilePath", input.filePath)
      .input("PageCount", input.pageCount ?? null)
      .input("TocJson", input.tocJson ? JSON.stringify(input.tocJson) : null)
      .input("CreatedByUserId", input.createdByUserId || null).query(`
        INSERT INTO dbo.VtepDocuments (Id, Title, Description, FileName, FilePath, PageCount, TocJson, CreatedByUserId)
        VALUES (@Id, @Title, @Description, @FileName, @FilePath, @PageCount, @TocJson, @CreatedByUserId)
      `);
    return { id };
  }

  static async createItems(
    items: Array<{
      documentId?: string | null;
      sectionKey?: string | null;
      skill?: string | null;
      part?: string | null;
      prompt?: string | null;
      optionsJson?: any;
      answerJson?: any;
      mediaUrl?: string | null;
      difficulty?: number | null;
      createdByUserId?: string | null;
    }>,
  ) {
    const pool = await getPool();
    for (const it of items) {
      const id = uuidv4();
      await pool
        .request()
        .input("Id", id)
        .input("DocumentId", it.documentId || null)
        .input("SectionKey", it.sectionKey || null)
        .input("Skill", it.skill || null)
        .input("Part", it.part || null)
        .input("Prompt", it.prompt || null)
        .input(
          "OptionsJson",
          typeof it.optionsJson === "undefined"
            ? null
            : JSON.stringify(it.optionsJson),
        )
        .input(
          "AnswerJson",
          typeof it.answerJson === "undefined"
            ? null
            : JSON.stringify(it.answerJson),
        )
        .input("MediaUrl", it.mediaUrl || null)
        .input("Difficulty", it.difficulty ?? null)
        .input("CreatedByUserId", it.createdByUserId || null).query(`
          INSERT INTO dbo.VtepItems (Id, DocumentId, SectionKey, Skill, Part, Prompt, OptionsJson, AnswerJson, MediaUrl, Difficulty, CreatedByUserId)
          VALUES (@Id, @DocumentId, @SectionKey, @Skill, @Part, @Prompt, @OptionsJson, @AnswerJson, @MediaUrl, @Difficulty, @CreatedByUserId)
        `);
    }
  }

  static async listDocuments(): Promise<any[]> {
    const pool = await getPool();
    // Detect if AudioPath column exists (migration may not have been applied)
    const colCheck = await pool
      .request()
      .query(
        `SELECT COUNT(*) as c FROM sys.columns WHERE name = 'AudioPath' AND object_id = OBJECT_ID('dbo.VtepDocuments')`,
      );
    const hasAudio = (colCheck.recordset?.[0]?.c || 0) > 0;

    const query = hasAudio
      ? `SELECT Id as id, Title as title, Description as description, FileName as fileName, FilePath as filePath, AudioPath as audioPath, PageCount as pageCount, TocJson as tocJson, CreatedByUserId as createdByUserId, CreatedAt as createdAt FROM dbo.VtepDocuments ORDER BY CreatedAt DESC`
      : `SELECT Id as id, Title as title, Description as description, FileName as fileName, FilePath as filePath, PageCount as pageCount, TocJson as tocJson, CreatedByUserId as createdByUserId, CreatedAt as createdAt FROM dbo.VtepDocuments ORDER BY CreatedAt DESC`;

    const res = await pool.request().query(query);
    const rows = res.recordset || [];
    return rows.map((r: any) => ({
      ...r,
      tocJson: r.tocJson ? JSON.parse(r.tocJson) : null,
    }));
  }

  static async getDocument(id: string): Promise<any | null> {
    const pool = await getPool();
    const colCheck = await pool
      .request()
      .query(
        `SELECT COUNT(*) as c FROM sys.columns WHERE name = 'AudioPath' AND object_id = OBJECT_ID('dbo.VtepDocuments')`,
      );
    const hasAudio = (colCheck.recordset?.[0]?.c || 0) > 0;

    const query = hasAudio
      ? `SELECT Id as id, Title as title, Description as description, FileName as fileName, FilePath as filePath, AudioPath as audioPath, PageCount as pageCount, TocJson as tocJson, CreatedByUserId as createdByUserId, CreatedAt as createdAt FROM dbo.VtepDocuments WHERE Id = @Id`
      : `SELECT Id as id, Title as title, Description as description, FileName as fileName, FilePath as filePath, PageCount as pageCount, TocJson as tocJson, CreatedByUserId as createdByUserId, CreatedAt as createdAt FROM dbo.VtepDocuments WHERE Id = @Id`;

    const res = await pool.request().input("Id", id).query(query);
    const r = res.recordset?.[0];
    if (!r) return null;
    return { ...r, tocJson: r.tocJson ? JSON.parse(r.tocJson) : null };
  }

  static async updateDocument(
    id: string,
    input: { title?: string | null; description?: string | null },
  ) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("Title", input.title || null)
      .input("Description", input.description || null).query(`
        UPDATE dbo.VtepDocuments
        SET Title = @Title, Description = @Description
        WHERE Id = @Id
      `);
    return { id };
  }

  static async setDocumentAudio(id: string, audioPath: string | null) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("AudioPath", audioPath || null).query(`
        UPDATE dbo.VtepDocuments
        SET AudioPath = @AudioPath
        WHERE Id = @Id
      `);
    return { id };
  }

  static async deleteDocument(id: string) {
    const pool = await getPool();
    // delete related items first
    await pool.request().input("DocumentId", id).query(`
      DELETE FROM dbo.VtepItems WHERE DocumentId = @DocumentId
    `);
    await pool.request().input("Id", id).query(`
      DELETE FROM dbo.VtepDocuments WHERE Id = @Id
    `);
    return { id };
  }

  static async listItemsForDocument(documentId: string) {
    const pool = await getPool();
    const res = await pool.request().input("DocumentId", documentId).query(`
        SELECT Id as id, DocumentId as documentId, SectionKey as sectionKey, Skill as skill, Part as part, Prompt as prompt, OptionsJson as optionsJson, AnswerJson as answerJson, MediaUrl as mediaUrl, Difficulty as difficulty, CreatedByUserId as createdByUserId, CreatedAt as createdAt
        FROM dbo.VtepItems
        WHERE DocumentId = @DocumentId
        ORDER BY CreatedAt ASC
      `);
    const rows = res.recordset || [];
    return rows.map((r: any) => ({
      ...r,
      optionsJson: r.optionsJson ? JSON.parse(r.optionsJson) : null,
      answerJson: r.answerJson ? JSON.parse(r.answerJson) : null,
    }));
  }

  static async updateItem(
    id: string,
    input: {
      sectionKey?: string | null;
      skill?: string | null;
      part?: string | null;
      prompt?: string | null;
      optionsJson?: any;
      answerJson?: any;
      mediaUrl?: string | null;
      difficulty?: number | null;
    },
  ) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("SectionKey", input.sectionKey || null)
      .input("Skill", input.skill || null)
      .input("Part", input.part || null)
      .input("Prompt", input.prompt || null)
      .input(
        "OptionsJson",
        typeof input.optionsJson === "undefined"
          ? null
          : JSON.stringify(input.optionsJson),
      )
      .input(
        "AnswerJson",
        typeof input.answerJson === "undefined"
          ? null
          : JSON.stringify(input.answerJson),
      )
      .input("MediaUrl", input.mediaUrl || null)
      .input("Difficulty", input.difficulty ?? null).query(`
        UPDATE dbo.VtepItems
        SET SectionKey = @SectionKey, Skill = @Skill, Part = @Part, Prompt = @Prompt, OptionsJson = @OptionsJson, AnswerJson = @AnswerJson, MediaUrl = @MediaUrl, Difficulty = @Difficulty
        WHERE Id = @Id
      `);
    return { id };
  }

  static async deleteItem(id: string) {
    const pool = await getPool();
    await pool.request().input("Id", id).query(`
      DELETE FROM dbo.VtepItems WHERE Id = @Id
    `);
    return { id };
  }
}

export default VtepRepository;
