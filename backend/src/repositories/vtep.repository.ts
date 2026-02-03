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

  static async listDocuments(options?: {
    page?: number;
    limit?: number;
    search?: string;
    skill?: string;
  }): Promise<{ documents: any[]; total: number; page: number; limit: number }> {
    const pool = await getPool();
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const offset = (page - 1) * limit;
    const search = options?.search?.trim();
    const skill = options?.skill?.trim();

    // Detect if AudioPath column exists (migration may not have been applied)
    const colCheck = await pool
      .request()
      .query(
        `SELECT COUNT(*) as c FROM sys.columns WHERE name = 'AudioPath' AND object_id = OBJECT_ID('dbo.VtepDocuments')`,
      );
    const hasAudio = (colCheck.recordset?.[0]?.c || 0) > 0;

    const selectCols = hasAudio
      ? `Id as id, Title as title, Description as description, FileName as fileName, FilePath as filePath, AudioPath as audioPath, PageCount as pageCount, TocJson as tocJson, CreatedByUserId as createdByUserId, CreatedAt as createdAt`
      : `Id as id, Title as title, Description as description, FileName as fileName, FilePath as filePath, PageCount as pageCount, TocJson as tocJson, CreatedByUserId as createdByUserId, CreatedAt as createdAt`;

    // Build WHERE clause
    const conditions: string[] = [];
    const req = pool.request();

    if (search) {
      conditions.push(`(Title LIKE @Search OR Description LIKE @Search OR FileName LIKE @Search)`);
      req.input("Search", `%${search}%`);
    }

    if (skill) {
      // Use JSON_VALUE for more reliable JSON querying in SQL Server
      // Check both 'skill' and 'defaultSkill' fields in the JSON
      // For "Listening", also include documents with NULL or empty TocJson (default to Listening)
      if (skill === "Listening") {
        conditions.push(`(
          JSON_VALUE(TocJson, '$.skill') = @Skill 
          OR JSON_VALUE(TocJson, '$.defaultSkill') = @Skill
          OR TocJson LIKE @SkillLike
          OR TocJson IS NULL
          OR TocJson = ''
          OR (JSON_VALUE(TocJson, '$.skill') IS NULL AND JSON_VALUE(TocJson, '$.defaultSkill') IS NULL)
        )`);
      } else {
        conditions.push(`(
          JSON_VALUE(TocJson, '$.skill') = @Skill 
          OR JSON_VALUE(TocJson, '$.defaultSkill') = @Skill
          OR TocJson LIKE @SkillLike
        )`);
      }
      req.input("Skill", skill);
      req.input("SkillLike", `%"${skill}"%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM dbo.VtepDocuments ${whereClause}`;
    const countRes = await req.query(countQuery);
    const total = countRes.recordset?.[0]?.total || 0;

    // Get paginated results
    const dataQuery = `
      SELECT ${selectCols}
      FROM dbo.VtepDocuments
      ${whereClause}
      ORDER BY CreatedAt DESC
      OFFSET @Offset ROWS
      FETCH NEXT @Limit ROWS ONLY
    `;

    req.input("Offset", offset).input("Limit", limit);
    const res = await req.query(dataQuery);
    const rows = res.recordset || [];
    const documents = rows.map((r: any) => ({
      ...r,
      tocJson: r.tocJson ? JSON.parse(r.tocJson) : null,
    }));

    return { documents, total, page, limit };
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
    input: { title?: string | null; description?: string | null; tocJson?: any },
  ) {
    const pool = await getPool();

    const sets: string[] = [];
    const req = pool.request().input("Id", id);

    if (typeof input.title !== "undefined") {
      sets.push("Title = @Title");
      req.input("Title", input.title || null);
    }
    if (typeof input.description !== "undefined") {
      sets.push("Description = @Description");
      req.input("Description", input.description || null);
    }
    if (typeof input.tocJson !== "undefined") {
      sets.push("TocJson = @TocJson");
      req.input(
        "TocJson",
        input.tocJson ? JSON.stringify(input.tocJson) : null,
      );
    }

    if (sets.length === 0) return { id };

    await req.query(`
        UPDATE dbo.VtepDocuments
        SET ${sets.join(", ")}
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
    
    // First, let's verify the document exists and get some info about it
    console.log(`🔍 VtepRepository.listItemsForDocument - Checking document: ${documentId}`);
    
    try {
      const docCheckRes = await pool.request()
        .input("DocumentId", documentId)
        .query(`
          SELECT Id, Name, Description, TocJson
          FROM dbo.VtepDocuments 
          WHERE Id = @DocumentId
        `);
      
      if (docCheckRes.recordset && docCheckRes.recordset.length > 0) {
        const doc = docCheckRes.recordset[0];
        console.log(`📄 Document found: Name="${doc.Name}", HasTocJson=${!!doc.TocJson}`);
        
        // Parse TocJson to check skill
        try {
          const tocJson = doc.TocJson ? JSON.parse(doc.TocJson) : null;
          console.log(`📋 Document skill: ${tocJson?.skill || 'Not specified'}`);
        } catch (e) {
          console.log(`⚠️ Could not parse TocJson: ${e}`);
        }
      } else {
        console.log(`❌ Document with ID ${documentId} not found in VtepDocuments table`);
        return [];
      }
    } catch (docError) {
      console.log(`❌ Error checking document: ${docError}`);
    }
    
    // Now check for items
    const res = await pool.request().input("DocumentId", documentId).query(`
        SELECT Id as id, DocumentId as documentId, SectionKey as sectionKey, Skill as skill, Part as part, Prompt as prompt, OptionsJson as optionsJson, AnswerJson as answerJson, MediaUrl as mediaUrl, Difficulty as difficulty, CreatedByUserId as createdByUserId, CreatedAt as createdAt
        FROM dbo.VtepItems
        WHERE DocumentId = @DocumentId
        ORDER BY CreatedAt ASC, ISNULL(SectionKey, '') ASC
      `);
    
    const rows = res.recordset || [];
    console.log(`📋 VtepRepository.listItemsForDocument - Found ${rows.length} items for document ${documentId}`);
    
    // If no items found, let's check if there are any items in the table at all
    if (rows.length === 0) {
      try {
        const totalItemsRes = await pool.request().query(`
          SELECT COUNT(*) as totalItems FROM dbo.VtepItems
        `);
        const totalItems = totalItemsRes.recordset[0]?.totalItems || 0;
        console.log(`📊 Total items in VtepItems table: ${totalItems}`);
        
        if (totalItems > 0) {
          // Check if there are items for other documents
          const otherDocsRes = await pool.request().query(`
            SELECT DISTINCT DocumentId, COUNT(*) as itemCount 
            FROM dbo.VtepItems 
            GROUP BY DocumentId
            ORDER BY itemCount DESC
          `);
          console.log(`📊 Items per document:`, otherDocsRes.recordset);
        }
      } catch (statsError) {
        console.log(`⚠️ Could not get table statistics: ${statsError}`);
      }
    }
    
    const mappedItems = rows.map((r: any) => {
      const item = {
        ...r,
        optionsJson: r.optionsJson ? JSON.parse(r.optionsJson) : null,
        answerJson: r.answerJson ? JSON.parse(r.answerJson) : null,
      };
      
      // Log prompt info for debugging
      if (item.prompt) {
        console.log(`📝 Item ${item.id}: Prompt length = ${item.prompt.length}, Preview: "${item.prompt.substring(0, 100)}..."`);
      } else {
        console.log(`📝 Item ${item.id}: No prompt content`);
      }
      
      return item;
    });
    
    return mappedItems;
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
