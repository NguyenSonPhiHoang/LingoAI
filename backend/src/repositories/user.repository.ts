import { getPool } from "../db";
import { User } from "../models/user.model";
import bcrypt from "bcryptjs";

export class UserRepository {
  // Insert user via sp_Users_Insert
  static async createUser(
    id: string,
    email: string | null,
    displayName: string | null,
    password?: string | null,
    roleId?: string | null,
    status?: string | null
  ): Promise<User> {
    const pool = await getPool();
    const hash = password ? await bcrypt.hash(password, 10) : null;
    await pool
      .request()
      .input("Id", id)
      .input("Email", email)
      .input("DisplayName", displayName)
      .input("PasswordHash", hash)
      .input("RoleId", roleId || "role_student")
      .input("Status", status || "pending")
      .input("CreatedAt", new Date())
      .execute("sp_Users_Insert");
    return {
      id,
      email,
      displayName,
      roleId,
      status: status || "pending",
    } as User;
  }

  // Upsert user via sp_Users_Upsert (for migration)
  static async upsert(user: User): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", user.id)
      .input("Email", user.email || null)
      .input("DisplayName", user.displayName || null)
      .input("Status", user.status || null)
      .input(
        "CreatedAt",
        user.createdAt ? new Date(user.createdAt) : new Date()
      )
      .execute("sp_Users_Upsert");
  }

  // Update user via sp_Users_Update
  static async update(
    id: string,
    email: string | null,
    displayName: string | null,
    password?: string | null,
    roleId?: string | null,
    status?: string | null
  ): Promise<void> {
    const pool = await getPool();
    const hash = password ? await bcrypt.hash(password, 10) : null;
    await pool
      .request()
      .input("Id", id)
      .input("Email", email)
      .input("DisplayName", displayName)
      .input("PasswordHash", hash)
      .input("RoleId", roleId)
      .input("Status", status || null)
      .execute("sp_Users_Update");
  }

  // Delete user via sp_Users_Delete
  static async delete(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).execute("sp_Users_Delete");
  }

  // Get user by email via sp_Users_GetByEmail
  static async findByEmail(email: string): Promise<any> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Email", email)
      .execute("sp_Users_GetByEmail");
    return res.recordset[0] || null;
  }

  // Get user by id via sp_Users_GetById
  static async findById(id: string): Promise<any> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("Id", id)
      .execute("sp_Users_GetById");
    return res.recordset[0] || null;
  }

  // Verify password (get hash via sp_Users_VerifyCredentials, then bcrypt compare)
  static async verifyPassword(
    userIdOrEmail: string,
    password: string
  ): Promise<boolean> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("EmailOrId", userIdOrEmail)
      .execute("sp_Users_VerifyCredentials");
    const row = res.recordset[0];
    if (!row || !row.PasswordHash) return false;
    return bcrypt.compare(password, row.PasswordHash);
  }

  // Assign role via sp_Users_AssignRole
  static async assignRole(userId: string, roleId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("UserId", userId)
      .input("RoleId", roleId)
      .execute("sp_Users_AssignRole");
  }

  // Get all users via sp_Users_GetAll
  static async findAll(): Promise<User[]> {
    const pool = await getPool();
    const res = await pool.request().execute("sp_Users_GetAll");
    return res.recordset.map((r: any) => ({
      id: r.Id,
      email: r.Email,
      displayName: r.DisplayName,
      roleId: r.RoleId,
      status: r.Status,
      createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    }));
  }
}
