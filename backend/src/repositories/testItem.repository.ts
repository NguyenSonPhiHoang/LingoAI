import { getPool } from "../db";

export interface TestItemRow {
  id: string;
  testId: string;
  userId?: string | null;
  type?: string | null;
  skill?: string | null;
  kind?: string | null;
  itemKey?: string | null;
  isCorrect?: boolean | null;
  score?: number | null;
  data?: string | null; // JSON
  createdAt?: string;
}

export class TestItemRepository {
  static async create(item: TestItemRow): Promise<TestItemRow> {
    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("Id", item.id)
      .input("TestId", item.testId)
      .input("UserId", item.userId || null)
      .input("Type", item.type || null)
      .input("Skill", item.skill || null)
      .input("Kind", item.kind || null)
      .input("ItemKey", item.itemKey || null)
      .input(
        "IsCorrect",
        typeof item.isCorrect === "boolean" ? item.isCorrect : null
      )
      .input("Score", item.score ?? null)
      .input("Data", item.data || null)
      .input("CreatedAt", now)
      .execute("sp_TestItems_Insert");

    return { ...item, createdAt: now.toISOString() };
  }

  static async listByTest(testId: string): Promise<TestItemRow[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("TestId", testId)
      .execute("sp_TestItems_ListByTest");
    return res.recordset.map(mapRow);
  }

  static async listByUser(userId: string): Promise<TestItemRow[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("UserId", userId)
      .execute("sp_TestItems_ListByUser");
    return res.recordset.map(mapRow);
  }
}

function mapRow(r: any): TestItemRow {
  return {
    id: r.Id,
    testId: r.TestId,
    userId: r.UserId,
    type: r.Type,
    skill: r.Skill,
    kind: r.Kind,
    itemKey: r.ItemKey,
    isCorrect:
      r.IsCorrect === null || r.IsCorrect === undefined ? null : !!r.IsCorrect,
    score: r.Score,
    data: r.Data,
    createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
  };
}
