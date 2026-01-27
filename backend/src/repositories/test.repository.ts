import { getPool } from "../db";

export interface TestResult {
  id: string;
  userId?: string | null;
  type?: string | null;
  data?: string | null; // JSON
  score?: number | null;
  createdAt?: string;

  // Structured fields for personalization
  contextType?: string | null;
  contextId?: string | null;
  skill?: string | null;
  totalQuestions?: number | null;
  correctAnswers?: number | null;
  durationSeconds?: number | null;
  clientCreatedAt?: string | null;
  completedAt?: string | null;
  version?: number | null;
}

export class TestRepository {
  // Insert via sp_Tests_Insert
  static async create(test: TestResult): Promise<TestResult> {
    // Debug: log when Tests are created to trace unexpected inserts
    try {
      console.debug("TestRepository.create called", {
        id: test.id,
        userId: test.userId,
        type: test.type,
      });
      console.debug(new Error("stack").stack);
    } catch (e) {
      // ignore logging errors
    }

    const pool = await getPool();
    const now = new Date();
    await pool
      .request()
      .input("Id", test.id)
      .input("UserId", test.userId || null)
      .input("Type", test.type || null)
      .input("Data", test.data || null)
      .input("Score", test.score ?? null)
      .input("CreatedAt", now)
      .input("ContextType", test.contextType || null)
      .input("ContextId", test.contextId || null)
      .input("Skill", test.skill || null)
      .input("TotalQuestions", test.totalQuestions ?? null)
      .input("CorrectAnswers", test.correctAnswers ?? null)
      .input("DurationSeconds", test.durationSeconds ?? null)
      .input(
        "ClientCreatedAt",
        test.clientCreatedAt ? new Date(test.clientCreatedAt) : null,
      )
      .input(
        "CompletedAt",
        test.completedAt ? new Date(test.completedAt) : null,
      )
      .input("Version", test.version ?? null)
      .execute("sp_Tests_Insert");
    return { ...test, createdAt: now.toISOString() };
  }

  // Update via sp_Tests_Update
  static async update(
    test: Partial<TestResult> & { id: string },
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", test.id)
      .input("Data", test.data || null)
      .input("Score", test.score ?? null)
      .input("ContextType", test.contextType || null)
      .input("ContextId", test.contextId || null)
      .input("Skill", test.skill || null)
      .input("TotalQuestions", test.totalQuestions ?? null)
      .input("CorrectAnswers", test.correctAnswers ?? null)
      .input("DurationSeconds", test.durationSeconds ?? null)
      .input(
        "ClientCreatedAt",
        test.clientCreatedAt ? new Date(test.clientCreatedAt) : null,
      )
      .input(
        "CompletedAt",
        test.completedAt ? new Date(test.completedAt) : null,
      )
      .input("Version", test.version ?? null)
      .execute("sp_Tests_Update");
  }

  // Delete via sp_Tests_Delete
  static async delete(id: string): Promise<void> {
    const pool = await getPool();
    // Best-effort cleanup of item-level rows (works even if FK cascade is not applied yet).
    try {
      await pool
        .request()
        .input("TestId", id)
        .execute("sp_TestItems_DeleteByTest");
    } catch {
      // ignore
    }
    await pool.request().input("Id", id).execute("sp_Tests_Delete");
  }

  // Get by id via sp_Tests_GetById
  static async findById(id: string): Promise<TestResult | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .execute("sp_Tests_GetById");
    const r = res.recordset[0];
    if (!r) return null;
    return mapRow(r);
  }

  // Get by user via sp_Tests_GetByUser
  static async findByUser(userId: string): Promise<TestResult[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("UserId", userId)
      .execute("sp_Tests_GetByUser");
    return res.recordset.map(mapRow);
  }

  // Public tests (created by admins/teachers with no UserId)
  static async findPublic(): Promise<TestResult[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .query(
        `SELECT * FROM Tests WHERE UserId IS NULL ORDER BY CreatedAt DESC`,
      );
    return res.recordset.map(mapRow);
  }
}

function mapRow(r: any): TestResult {
  return {
    id: r.Id,
    userId: r.UserId,
    type: r.Type,
    data: r.Data,
    score: r.Score,
    createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,

    contextType: r.ContextType ?? null,
    contextId: r.ContextId ?? null,
    skill: r.Skill ?? null,
    totalQuestions:
      typeof r.TotalQuestions === "number"
        ? r.TotalQuestions
        : (r.TotalQuestions ?? null),
    correctAnswers:
      typeof r.CorrectAnswers === "number"
        ? r.CorrectAnswers
        : (r.CorrectAnswers ?? null),
    durationSeconds:
      typeof r.DurationSeconds === "number"
        ? r.DurationSeconds
        : (r.DurationSeconds ?? null),
    clientCreatedAt: r.ClientCreatedAt
      ? new Date(r.ClientCreatedAt).toISOString()
      : null,
    completedAt: r.CompletedAt ? new Date(r.CompletedAt).toISOString() : null,
    version: typeof r.Version === "number" ? r.Version : (r.Version ?? null),
  };
}
