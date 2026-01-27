import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";

export class VtepTestRepository {
  static async create(input: {
    title?: string | null;
    description?: string | null;
    createdByUserId?: string | null;
    isActive?: boolean;
    isPublic?: boolean;
  }) {
    const pool = await getPool();
    const id = uuidv4();
    await pool
      .request()
      .input("Id", id)
      .input("Title", input.title || null)
      .input("Description", input.description || null)
      .input("CreatedByUserId", input.createdByUserId || null)
      .input("IsActive", input.isActive ? 1 : 0)
      .input("IsPublic", input.isPublic ? 1 : 0).query(`
        INSERT INTO dbo.VtepTests (Id, Title, Description, CreatedByUserId, IsActive, IsPublic, CreatedAt)
        VALUES (@Id, @Title, @Description, @CreatedByUserId, @IsActive, @IsPublic, SYSUTCDATETIME())
      `);
    return { id };
  }

  static async listAll(): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT Id as id, Title as title, Description as description, CreatedByUserId as createdByUserId, IsActive as isActive, IsPublic as isPublic, CreatedAt as createdAt
      FROM dbo.VtepTests
      ORDER BY CreatedAt DESC
    `);
    return res.recordset || [];
  }

  static async listActivePublic(): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT Id as id, Title as title, Description as description, CreatedByUserId as createdByUserId, IsActive as isActive, IsPublic as isPublic, CreatedAt as createdAt
      FROM dbo.VtepTests
      WHERE IsActive = 1 AND IsPublic = 1
      ORDER BY CreatedAt DESC
    `);
    return res.recordset || [];
  }

  static async findById(id: string): Promise<any | null> {
    const pool = await getPool();
    const res = await pool.request().input("Id", id).query(`
      SELECT Id as id, Title as title, Description as description, CreatedByUserId as createdByUserId, IsActive as isActive, IsPublic as isPublic, CreatedAt as createdAt
      FROM dbo.VtepTests WHERE Id = @Id
    `);
    return res.recordset?.[0] ?? null;
  }

  static async setActive(id: string, isActive: boolean) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("IsActive", isActive ? 1 : 0).query(`
      UPDATE dbo.VtepTests SET IsActive = @IsActive WHERE Id = @Id
    `);
    return { id };
  }

  static async update(
    id: string,
    input: {
      title?: string | null;
      description?: string | null;
      isActive?: boolean | null;
      isPublic?: boolean | null;
    },
  ) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("Title", input.title || null)
      .input("Description", input.description || null)
      .input(
        "IsActive",
        typeof input.isActive === "boolean" ? (input.isActive ? 1 : 0) : null,
      )
      .input(
        "IsPublic",
        typeof input.isPublic === "boolean" ? (input.isPublic ? 1 : 0) : null,
      ).query(`
        UPDATE dbo.VtepTests
        SET Title = COALESCE(@Title, Title), Description = COALESCE(@Description, Description), IsActive = COALESCE(@IsActive, IsActive), IsPublic = COALESCE(@IsPublic, IsPublic)
        WHERE Id = @Id
      `);
    return { id };
  }

  static async delete(id: string) {
    const pool = await getPool();
    // delete items first
    await pool
      .request()
      .input("VtepTestId", id)
      .query(`DELETE FROM dbo.VtepTestItems WHERE VtepTestId = @VtepTestId`);
    await pool
      .request()
      .input("Id", id)
      .query(`DELETE FROM dbo.VtepTests WHERE Id = @Id`);
    return { id };
  }
}

export default VtepTestRepository;
