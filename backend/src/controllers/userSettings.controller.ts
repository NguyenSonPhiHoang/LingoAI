import { Request, Response } from "express";
import UserSettingsRepository from "../repositories/userSettings.repository";

export class UserSettingsController {
  static async getCurrentUserSettings(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });
      const dbRow = await UserSettingsRepository.getByUserId(user.sub);
      const settings =
        dbRow && dbRow.Settings ? JSON.parse(dbRow.Settings) : {};
      res.json({ userId: user.sub, settings, updatedAt: dbRow?.UpdatedAt });
    } catch (err: any) {
      console.error("Get settings error:", err);
      res.status(500).json({ error: err.message || "Failed to get settings" });
    }
  }

  static async saveCurrentUserSettings(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });
      const settings = req.body || {};
      const geminiApiKey = settings.geminiApiKey || null;
      const json = JSON.stringify(settings);
      console.debug("Save settings for user", user.sub, json);
      try {
        await UserSettingsRepository.upsert(user.sub, json, geminiApiKey);
      } catch (err) {
        console.error("Failed to upsert settings:", err);
        return res.status(500).json({ error: "Failed to persist settings" });
      }

      // Return the saved record for frontend confirmation
      const dbRow = await UserSettingsRepository.getByUserId(user.sub);
      const saved = dbRow && dbRow.Settings ? JSON.parse(dbRow.Settings) : {};
      return res.json({
        ok: true,
        saved,
        geminiApiKey: dbRow?.GeminiApiKey || null,
        updatedAt: dbRow?.UpdatedAt,
      });
    } catch (err: any) {
      console.error("Save settings error:", err);
      res.status(500).json({ error: err.message || "Failed to save settings" });
    }
  }
}

export default UserSettingsController;
