import { getPool } from "../db";

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
}

export class RoleRepository {
  // Insert role via sp_Roles_Insert
  static async create(
    id: string,
    name: string,
    description?: string | null
  ): Promise<Role> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("Name", name)
      .input("Description", description || null)
      .input("CreatedAt", new Date())
      .execute("sp_Roles_Insert");
    return { id, name, description };
  }

  // Update role via sp_Roles_Update
  static async update(
    id: string,
    name: string,
    description?: string | null
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", id)
      .input("Name", name)
      .input("Description", description || null)
      .execute("sp_Roles_Update");
  }

  // Delete role via sp_Roles_Delete
  static async delete(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).execute("sp_Roles_Delete");
  }

  // Get role by id via sp_Roles_GetById
  static async findById(id: string): Promise<Role | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .execute("sp_Roles_GetById");
    const r = res.recordset[0];
    if (!r) return null;
    return {
      id: r.Id,
      name: r.Name,
      description: r.Description,
      createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    };
  }

  // Get role by name via sp_Roles_GetByName
  static async findByName(name: string): Promise<Role | null> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Name", name)
      .execute("sp_Roles_GetByName");
    const r = res.recordset[0];
    if (!r) return null;
    return {
      id: r.Id,
      name: r.Name,
      description: r.Description,
      createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    };
  }

  // Get all roles via sp_Roles_GetAll
  static async findAll(): Promise<Role[]> {
    const pool = await getPool();
    const res = await pool.request().execute("sp_Roles_GetAll");
    return res.recordset.map((r: any) => ({
      id: r.Id,
      name: r.Name,
      description: r.Description,
      createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    }));
  }
}
