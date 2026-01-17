import { apiGet, apiPut } from "./api";
import { getStoredToken } from "./auth-api";

export interface UserSettings {
  speechRate?: number;
  theme?: string;
  geminiApiKey?: string | null;
  chatBotId?: string | null;
  [key: string]: any;
}

export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    const token = getStoredToken();
    if (!token) return null;

    const res = await apiGet<{
      settings: UserSettings;
      geminiApiKey?: string | null;
      chatBotId?: string | null;
    }>("/api/settings", token);
    const combined: UserSettings = { ...(res?.settings || {}) };
    if (res?.geminiApiKey !== undefined)
      combined.geminiApiKey = res.geminiApiKey;
    if (res?.chatBotId !== undefined) combined.chatBotId = res.chatBotId;
    return combined;
  } catch (err) {
    console.error("getUserSettings failed:", err);
    return null;
  }
}

export async function saveUserSettings(
  settings: UserSettings
): Promise<boolean> {
  try {
    const token = getStoredToken();
    if (!token) return false;

    await apiPut("/api/settings", settings, token);
    return true;
  } catch (err) {
    console.error("saveUserSettings failed:", err);
    return false;
  }
}

export default { getUserSettings, saveUserSettings };
