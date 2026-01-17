"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserRepository {
    // Insert user via sp_Users_Insert
    static async createUser(id, email, displayName, password, roleId, status, omniChatEnabled) {
        const pool = await (0, db_1.getPool)();
        const hash = password ? await bcryptjs_1.default.hash(password, 10) : null;
        await pool
            .request()
            .input("Id", id)
            .input("Email", email)
            .input("DisplayName", displayName)
            .input("PasswordHash", hash)
            .input("RoleId", roleId || "role_student")
            .input("Status", status || "pending")
            .input("OmniChatEnabled", typeof omniChatEnabled === "boolean" ? (omniChatEnabled ? 1 : 0) : null)
            .input("CreatedAt", new Date())
            .execute("sp_Users_Insert");
        return {
            id,
            email,
            displayName,
            roleId,
            status: status || "pending",
            omniChatEnabled: typeof omniChatEnabled === "boolean" ? omniChatEnabled : true,
        };
    }
    // Upsert user via sp_Users_Upsert (for migration)
    static async upsert(user) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("Id", user.id)
            .input("Email", user.email || null)
            .input("DisplayName", user.displayName || null)
            .input("Status", user.status || null)
            .input("OmniChatEnabled", typeof user.omniChatEnabled === "boolean"
            ? user.omniChatEnabled
                ? 1
                : 0
            : null)
            .input("CreatedAt", user.createdAt ? new Date(user.createdAt) : new Date())
            .execute("sp_Users_Upsert");
    }
    // Update user via sp_Users_Update
    static async update(id, email, displayName, password, roleId, status, omniChatEnabled) {
        const pool = await (0, db_1.getPool)();
        const hash = password ? await bcryptjs_1.default.hash(password, 10) : null;
        await pool
            .request()
            .input("Id", id)
            .input("Email", email)
            .input("DisplayName", displayName)
            .input("PasswordHash", hash)
            .input("RoleId", roleId)
            .input("Status", status || null)
            .input("OmniChatEnabled", typeof omniChatEnabled === "boolean" ? (omniChatEnabled ? 1 : 0) : null)
            .execute("sp_Users_Update");
    }
    // Delete user via sp_Users_Delete
    static async delete(id) {
        const pool = await (0, db_1.getPool)();
        await pool.request().input("Id", id).execute("sp_Users_Delete");
    }
    // Get user by email via sp_Users_GetByEmail
    static async findByEmail(email) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("Email", email)
            .execute("sp_Users_GetByEmail");
        const row = res.recordset[0] || null;
        if (!row)
            return null;
        return {
            ...row,
            OmniChatEnabled: typeof row.OmniChatEnabled === "boolean"
                ? row.OmniChatEnabled
                : row.OmniChatEnabled === 1,
        };
    }
    // Get user by id via sp_Users_GetById
    static async findById(id) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("Id", id)
            .execute("sp_Users_GetById");
        const row = res.recordset[0] || null;
        if (!row)
            return null;
        return {
            ...row,
            OmniChatEnabled: typeof row.OmniChatEnabled === "boolean"
                ? row.OmniChatEnabled
                : row.OmniChatEnabled === 1,
        };
    }
    // Verify password (get hash via sp_Users_VerifyCredentials, then bcrypt compare)
    static async verifyPassword(userIdOrEmail, password) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("EmailOrId", userIdOrEmail)
            .execute("sp_Users_VerifyCredentials");
        const row = res.recordset[0];
        if (!row || !row.PasswordHash)
            return false;
        return bcryptjs_1.default.compare(password, row.PasswordHash);
    }
    // Assign role via sp_Users_AssignRole
    static async assignRole(userId, roleId) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("UserId", userId)
            .input("RoleId", roleId)
            .execute("sp_Users_AssignRole");
    }
    // Get all users via sp_Users_GetAll
    static async findAll() {
        const pool = await (0, db_1.getPool)();
        const res = await pool.request().execute("sp_Users_GetAll");
        return res.recordset.map((r) => ({
            id: r.Id,
            email: r.Email,
            displayName: r.DisplayName,
            roleId: r.RoleId,
            status: r.Status,
            omniChatEnabled: typeof r.OmniChatEnabled === "boolean"
                ? r.OmniChatEnabled
                : r.OmniChatEnabled === 1,
            createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
        }));
    }
}
exports.UserRepository = UserRepository;
