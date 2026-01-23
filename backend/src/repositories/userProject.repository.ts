import { getPool } from "../db";

export interface UserProject {
  Id: string;
  UserId: string;
  Name: string;
  Description?: string | null;
  Data?: string | null;
  CreatedAt?: Date | null;
  UpdatedAt?: Date | null;
}

export class UserProjectRepository {
  static async create(project: UserProject) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", project.Id)
      .input("UserId", project.UserId)
      .input("Name", project.Name)
      .input("Description", project.Description || null)
      .input("Data", project.Data || null)
      .input("CreatedAt", project.CreatedAt || new Date())
      .input("UpdatedAt", project.UpdatedAt || new Date())
      .execute("sp_UserProjects_Insert");
    return project;
  }

  static async update(project: UserProject) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", project.Id)
      .input("UserId", project.UserId)
      .input("Name", project.Name)
      .input("Description", project.Description || null)
      .input("Data", project.Data || null)
      .input("UpdatedAt", project.UpdatedAt || new Date())
      .execute("sp_UserProjects_Update");
    return project;
  }

  static async delete(id: string, userId: string) {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .execute("sp_UserProjects_Delete");
  }

  static async getById(id: string, userId: string) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", id)
      .input("UserId", userId)
      .execute("sp_UserProjects_GetById");
    return result.recordset && result.recordset.length
      ? result.recordset[0]
      : null;
  }

  static async listByUser(userId: string) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("UserId", userId)
      .execute("sp_UserProjects_ListByUser");
    return result.recordset || [];
  }
}

export default UserProjectRepository;
