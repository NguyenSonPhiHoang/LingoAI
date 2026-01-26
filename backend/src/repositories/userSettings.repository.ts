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
    geminiApiKey?: string | null,
    allowGemini?: boolean | null,
  ) {
    const pool = await getPool();
    try {
      console.debug(
        "UserSettingsRepository.upsert: userId=",
        userId,
        "len=",
        settingsJson ? settingsJson.length : 0,
      );
      const request = pool.request();
      request.input("UserId", userId);
      request.input("Settings", settingsJson);
      request.input("GeminiApiKey", geminiApiKey || null);
      request.input(
        "AllowGemini",
        allowGemini === undefined || allowGemini === null
          ? null
          : allowGemini
            ? 1
            : 0,
      );
      request.input("UpdatedAt", new Date());

      // Try executing with AllowGemini; if the stored-proc on the server
      // hasn't been updated and rejects extra params, retry without it.
      let result: any;
      try {
        result = await request.execute("sp_UserSettings_Upsert");
      } catch (e: any) {
        const infoNumber = e && e.info && e.info.number;
        if (infoNumber === 8144) {
          // Too many arguments: retry without AllowGemini param
          const request2 = pool.request();
          request2.input("UserId", userId);
          request2.input("Settings", settingsJson);
          request2.input("GeminiApiKey", geminiApiKey || null);
          request2.input("UpdatedAt", new Date());
          result = await request2.execute("sp_UserSettings_Upsert");
        } else {
          throw e;
        }
      }
      // Some drivers return info in result; log for debugging
      console.debug(
        "UserSettingsRepository.upsert result:",
        result && result.returnValue,
      );
      return result;
    } catch (err) {
      console.error("UserSettingsRepository.upsert error:", err);
      throw err;
    }
  }
}

export default UserSettingsRepository;
