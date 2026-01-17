"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileRepository = void 0;
const db_1 = require("../db");
class UserProfileRepository {
    static async getByUserId(userId) {
        const pool = await (0, db_1.getPool)();
        const result = await pool
            .request()
            .input("UserId", userId)
            .execute("sp_UserProfiles_GetByUserId");
        return result.recordset && result.recordset.length
            ? result.recordset[0]
            : null;
    }
    static async upsert(profile) {
        const pool = await (0, db_1.getPool)();
        const now = new Date();
        await pool
            .request()
            .input("UserId", profile.UserId)
            .input("DisplayName", profile.DisplayName || null)
            .input("PhotoUrl", profile.PhotoUrl || null)
            .input("Bio", profile.Bio || null)
            .input("Status", profile.Status || null)
            .input("CreatedAt", profile.CreatedAt || now)
            .input("UpdatedAt", profile.UpdatedAt || now)
            .execute("sp_UserProfiles_Upsert");
    }
}
exports.UserProfileRepository = UserProfileRepository;
exports.default = UserProfileRepository;
