"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSettingsRepository = void 0;
const db_1 = require("../db");
class UserSettingsRepository {
    static async getByUserId(userId) {
        const pool = await (0, db_1.getPool)();
        const result = await pool
            .request()
            .input("UserId", userId)
            .execute("sp_UserSettings_Get");
        return result.recordset && result.recordset.length
            ? result.recordset[0]
            : null;
    }
    static async upsert(userId, settingsJson, geminiApiKey) {
        const pool = await (0, db_1.getPool)();
        try {
            console.debug("UserSettingsRepository.upsert: userId=", userId, "len=", settingsJson ? settingsJson.length : 0);
            const result = await pool
                .request()
                .input("UserId", userId)
                .input("Settings", settingsJson)
                .input("GeminiApiKey", geminiApiKey || null)
                .input("UpdatedAt", new Date().toISOString())
                .execute("sp_UserSettings_Upsert");
            // Some drivers return info in result; log for debugging
            console.debug("UserSettingsRepository.upsert result:", result && result.returnValue);
            return result;
        }
        catch (err) {
            console.error("UserSettingsRepository.upsert error:", err);
            throw err;
        }
    }
}
exports.UserSettingsRepository = UserSettingsRepository;
exports.default = UserSettingsRepository;
