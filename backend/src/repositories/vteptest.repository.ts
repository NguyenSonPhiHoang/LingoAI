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
      SELECT 
        vt.Id as id,
        vt.Title as title,
        vt.Description as description,
        vt.CreatedByUserId as createdByUserId,
        vt.IsActive as isActive,
        vt.IsPublic as isPublic,
        vt.CreatedAt as createdAt,
        CASE 
          WHEN vw.Id IS NOT NULL OR SUM(CASE WHEN vti.Skill = 'Writing' THEN 1 ELSE 0 END) > 0 THEN 'Writing'
          WHEN SUM(CASE WHEN vti.Skill = 'Listening' THEN 1 ELSE 0 END) > 0
               AND SUM(CASE WHEN vti.Skill = 'Reading' THEN 1 ELSE 0 END) > 0 THEN 'Listening/Reading'
          WHEN SUM(CASE WHEN vti.Skill = 'Listening' THEN 1 ELSE 0 END) > 0 THEN 'Listening'
          WHEN SUM(CASE WHEN vti.Skill = 'Reading' THEN 1 ELSE 0 END) > 0 THEN 'Reading'
          ELSE 'Listening/Reading'
        END as skill
      FROM dbo.VtepTests vt
      LEFT JOIN dbo.VtepWritingTests vw ON vw.Id = vt.Id
      LEFT JOIN dbo.VtepTestItems vti ON vti.VtepTestId = vt.Id
      GROUP BY vt.Id, vt.Title, vt.Description, vt.CreatedByUserId, vt.IsActive, vt.IsPublic, vt.CreatedAt, vw.Id
      ORDER BY vt.CreatedAt DESC
    `);
    return res.recordset || [];
  }

  static async listActivePublic(): Promise<any[]> {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT 
        vt.Id as id,
        vt.Title as title,
        vt.Description as description,
        vt.CreatedByUserId as createdByUserId,
        vt.IsActive as isActive,
        vt.IsPublic as isPublic,
        vt.CreatedAt as createdAt,
        CASE 
          WHEN vw.Id IS NOT NULL OR SUM(CASE WHEN vti.Skill = 'Writing' THEN 1 ELSE 0 END) > 0 THEN 'Writing'
          WHEN SUM(CASE WHEN vti.Skill = 'Listening' THEN 1 ELSE 0 END) > 0
               AND SUM(CASE WHEN vti.Skill = 'Reading' THEN 1 ELSE 0 END) > 0 THEN 'Listening/Reading'
          WHEN SUM(CASE WHEN vti.Skill = 'Listening' THEN 1 ELSE 0 END) > 0 THEN 'Listening'
          WHEN SUM(CASE WHEN vti.Skill = 'Reading' THEN 1 ELSE 0 END) > 0 THEN 'Reading'
          ELSE 'Listening/Reading'
        END as skill
      FROM dbo.VtepTests vt
      LEFT JOIN dbo.VtepWritingTests vw ON vw.Id = vt.Id
      LEFT JOIN dbo.VtepTestItems vti ON vti.VtepTestId = vt.Id
      WHERE vt.IsActive = 1 AND vt.IsPublic = 1
      GROUP BY vt.Id, vt.Title, vt.Description, vt.CreatedByUserId, vt.IsActive, vt.IsPublic, vt.CreatedAt, vw.Id
      ORDER BY vt.CreatedAt DESC
    `);
    return res.recordset || [];
  }

  static async findById(id: string): Promise<any | null> {
    const pool = await getPool();
    const res = await pool.request().input("Id", id).query(`
      SELECT 
        vt.Id as id,
        vt.Title as title,
        vt.Description as description,
        vt.CreatedByUserId as createdByUserId,
        vt.IsActive as isActive,
        vt.IsPublic as isPublic,
        vt.CreatedAt as createdAt,
        CASE 
          WHEN vw.Id IS NOT NULL OR SUM(CASE WHEN vti.Skill = 'Writing' THEN 1 ELSE 0 END) > 0 THEN 'Writing'
          WHEN SUM(CASE WHEN vti.Skill = 'Listening' THEN 1 ELSE 0 END) > 0
               AND SUM(CASE WHEN vti.Skill = 'Reading' THEN 1 ELSE 0 END) > 0 THEN 'Listening/Reading'
          WHEN SUM(CASE WHEN vti.Skill = 'Listening' THEN 1 ELSE 0 END) > 0 THEN 'Listening'
          WHEN SUM(CASE WHEN vti.Skill = 'Reading' THEN 1 ELSE 0 END) > 0 THEN 'Reading'
          ELSE 'Listening/Reading'
        END as skill
      FROM dbo.VtepTests vt
      LEFT JOIN dbo.VtepWritingTests vw ON vw.Id = vt.Id
      LEFT JOIN dbo.VtepTestItems vti ON vti.VtepTestId = vt.Id
      WHERE vt.Id = @Id
      GROUP BY vt.Id, vt.Title, vt.Description, vt.CreatedByUserId, vt.IsActive, vt.IsPublic, vt.CreatedAt, vw.Id
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
