import { getPool } from "../db";

export class UserSettingsRepository {
  static async getByUserId(userId: string) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("UserId", userId)
      .execute("sp_UserSettings_Get");
    return result.recordset && result.recordset.length
      ? result.recordset[0]
      : null;
  }

  static async upsert(
    userId: string,
    settingsJson: string,
    geminiApiKey?: string | null
  ) {
    const pool = await getPool();
    try {
      console.debug(
        "UserSettingsRepository.upsert: userId=",
        userId,
        "len=",
        settingsJson ? settingsJson.length : 0
      );
      const result = await pool
        .request()
        .input("UserId", userId)
        .input("Settings", settingsJson)
        .input("GeminiApiKey", geminiApiKey || null)
        .input("UpdatedAt", new Date().toISOString())
        .execute("sp_UserSettings_Upsert");
      // Some drivers return info in result; log for debugging
      console.debug(
        "UserSettingsRepository.upsert result:",
        result && result.returnValue
      );
      return result;
    } catch (err) {
      console.error("UserSettingsRepository.upsert error:", err);
      throw err;
    }
  }
}

export default UserSettingsRepository;
