import { getPool } from "../db";

export interface TestResult {
  id: string;
  userId?: string | null;
  type?: string | null;
  data?: string | null; // JSON
  score?: number | null;
  createdAt?: string;
}

export class TestRepository {
  // Insert via sp_Tests_Insert
  static async create(test: TestResult): Promise<TestResult> {
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
      .execute("sp_Tests_Insert");
    return { ...test, createdAt: now.toISOString() };
  }

  // Update via sp_Tests_Update
  static async update(
    test: Partial<TestResult> & { id: string }
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", test.id)
      .input("Data", test.data || null)
      .input("Score", test.score ?? null)
      .execute("sp_Tests_Update");
  }

  // Delete via sp_Tests_Delete
  static async delete(id: string): Promise<void> {
    const pool = await getPool();
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
}

function mapRow(r: any): TestResult {
  return {
    id: r.Id,
    userId: r.UserId,
    type: r.Type,
    data: r.Data,
    score: r.Score,
    createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
  };
}
