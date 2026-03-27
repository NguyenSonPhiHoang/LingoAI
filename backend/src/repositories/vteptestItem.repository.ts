import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";

export class VtepTestItemRepository {
  static async createItems(
    items: Array<{
      vtepTestId: string;
      ord?: number | null;
      sourceDocumentId?: string | null;
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
        .input("VtepTestId", it.vtepTestId)
        .input("Ord", it.ord ?? null)
        .input("SourceDocumentId", it.sourceDocumentId || null)
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
          INSERT INTO dbo.VtepTestItems (Id, VtepTestId, Ord, SourceDocumentId, Prompt, OptionsJson, AnswerJson, MediaUrl, Difficulty, CreatedByUserId, CreatedAt)
          VALUES (@Id, @VtepTestId, @Ord, @SourceDocumentId, @Prompt, @OptionsJson, @AnswerJson, @MediaUrl, @Difficulty, @CreatedByUserId, SYSUTCDATETIME())
        `);
    }
  }

  static async listItemsForTest(vtepTestId: string) {
    const pool = await getPool();
    const res = await pool.request().input("VtepTestId", vtepTestId).query(`
      SELECT Id as id, VtepTestId as vtepTestId, Ord as ord, SourceDocumentId as sourceDocumentId, Prompt as prompt, OptionsJson as optionsJson, AnswerJson as answerJson, MediaUrl as mediaUrl, Difficulty as difficulty, CreatedByUserId as createdByUserId, CreatedAt as createdAt
      FROM dbo.VtepTestItems
      WHERE VtepTestId = @VtepTestId
      ORDER BY Ord ASC, CreatedAt ASC
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
      ord?: number | null;
      sectionKey?: string | null;
      sourceDocumentId?: string | null;
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
      .input("Ord", input.ord ?? null)
      .input("SectionKey", input.sectionKey || null)
      .input("SourceDocumentId", input.sourceDocumentId || null)
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
        UPDATE dbo.VtepTestItems
        SET Ord = @Ord, SectionKey = @SectionKey, SourceDocumentId = @SourceDocumentId, Prompt = @Prompt, OptionsJson = @OptionsJson, AnswerJson = @AnswerJson, MediaUrl = @MediaUrl, Difficulty = @Difficulty
        WHERE Id = @Id
      `);
    return { id };
  }

  static async deleteItem(id: string) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .query(`DELETE FROM dbo.VtepTestItems WHERE Id = @Id`);
    return { id };
  }
}

export default VtepTestItemRepository;
