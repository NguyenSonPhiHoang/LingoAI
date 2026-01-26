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
      // Determine allowGemini flag from DB column if present, otherwise from JSON
      const allowFromColumn =
        dbRow && dbRow.AllowGemini !== undefined
          ? dbRow.AllowGemini === 1 || dbRow.AllowGemini === true
          : undefined;
      const allowFromJson = !!settings.allowGeminiApiKey;
      const allowGeminiApiKey =
        allowFromColumn === undefined ? allowFromJson : !!allowFromColumn;
      res.json({
        userId: user.sub,
        settings,
        updatedAt: dbRow?.UpdatedAt,
        allowGeminiApiKey,
      });
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

      // Load existing settings to determine whether updating Gemini key is allowed
      const existingRow = await UserSettingsRepository.getByUserId(user.sub);
      let existingAllow: boolean | null = null;
      try {
        if (existingRow && existingRow.AllowGemini !== undefined) {
          existingAllow =
            existingRow.AllowGemini === 1 || existingRow.AllowGemini === true;
        } else if (existingRow && existingRow.Settings) {
          const es = JSON.parse(existingRow.Settings);
          if (es && typeof es.allowGeminiApiKey === "boolean")
            existingAllow = es.allowGeminiApiKey;
        }
      } catch (err) {
        existingAllow = null;
      }

      // If the DB explicitly forbids Gemini key updates, block changes to the key
      if (existingAllow === false) {
        const existingKey = existingRow?.GeminiApiKey || null;
        if ((geminiApiKey || null) !== (existingKey || null)) {
          return res
            .status(403)
            .json({ error: "Updating Gemini API key is not allowed" });
        }
      }

      try {
        // Do NOT accept allow flag from user settings payload — only admins set this.
        await UserSettingsRepository.upsert(
          user.sub,
          json,
          geminiApiKey,
          existingAllow,
        );
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
