"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSettingsController = void 0;
const userSettings_repository_1 = __importDefault(require("../repositories/userSettings.repository"));
class UserSettingsController {
    static async getCurrentUserSettings(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const dbRow = await userSettings_repository_1.default.getByUserId(user.sub);
            const settings = dbRow && dbRow.Settings ? JSON.parse(dbRow.Settings) : {};
            res.json({ userId: user.sub, settings, updatedAt: dbRow?.UpdatedAt });
        }
        catch (err) {
            console.error("Get settings error:", err);
            res.status(500).json({ error: err.message || "Failed to get settings" });
        }
    }
    static async saveCurrentUserSettings(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const settings = req.body || {};
            const geminiApiKey = settings.geminiApiKey || null;
            const json = JSON.stringify(settings);
            console.debug("Save settings for user", user.sub, json);
            try {
                await userSettings_repository_1.default.upsert(user.sub, json, geminiApiKey);
            }
            catch (err) {
                console.error("Failed to upsert settings:", err);
                return res.status(500).json({ error: "Failed to persist settings" });
            }
            // Return the saved record for frontend confirmation
            const dbRow = await userSettings_repository_1.default.getByUserId(user.sub);
            const saved = dbRow && dbRow.Settings ? JSON.parse(dbRow.Settings) : {};
            return res.json({
                ok: true,
                saved,
                geminiApiKey: dbRow?.GeminiApiKey || null,
                updatedAt: dbRow?.UpdatedAt,
            });
        }
        catch (err) {
            console.error("Save settings error:", err);
            res.status(500).json({ error: err.message || "Failed to save settings" });
        }
    }
}
exports.UserSettingsController = UserSettingsController;
exports.default = UserSettingsController;
