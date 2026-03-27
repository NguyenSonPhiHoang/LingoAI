import { Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AuthRequest } from "../middleware/auth.middleware";
import { config } from "../config";
import UserSettingsRepository from "../repositories/userSettings.repository";

type ChatHistoryItem = {
  role: "user" | "model";
  content: string;
};

type ConversationMode = "natural" | "guided";

const clientByKey = new Map<string, GoogleGenerativeAI>();

function getUserId(req: AuthRequest): string | null {
  const sub = req.user?.sub;
  return typeof sub === "string" && sub.trim() ? sub : null;
}

function getClientForKey(apiKey: string): GoogleGenerativeAI {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("Gemini API key is empty.");
  }
  const cached = clientByKey.get(trimmed);
  if (cached) return cached;
  const created = new GoogleGenerativeAI(trimmed);
  clientByKey.set(trimmed, created);
  return created;
}

async function getApiKeyForUser(userId: string): Promise<string> {
  // Prefer per-user key (saved in Settings/GeminiApiKey), fallback to server key.
  const row = await UserSettingsRepository.getByUserId(userId);
  const userKey = row?.GeminiApiKey;
  if (typeof userKey === "string" && userKey.trim()) return userKey;

  const serverKey = config.geminiApiKey;
  if (typeof serverKey === "string" && serverKey.trim()) return serverKey;

  throw new Error(
    "Gemini API key not configured. Add geminiApiKey in Settings or set GEMINI_API_KEY on the backend."
  );
}

function normalizeHistory(history: any): ChatHistoryItem[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (h) =>
        h &&
        (h.role === "user" || h.role === "model") &&
        typeof h.content === "string" &&
        h.content.trim()
    )
    .slice(-12)
    .map((h) => ({ role: h.role, content: String(h.content) }));
}

function normalizeMode(mode: any): ConversationMode {
  if (mode === "natural" || mode === "guided") return mode;
  return "guided";
}

function getSystemInstruction(mode: ConversationMode): string {
  if (mode === "natural") {
    return [
      "You are a friendly English conversation partner.",
      "Have a natural back-and-forth conversation.",
      "Reply in English.",
      "Keep responses short (1–2 sentences).",
      "Do NOT correct the user's grammar/pronunciation.",
      "Do NOT teach, coach, or give study tips.",
      "Do NOT provide reply suggestions or structured guidance.",
      "Ask a short follow-up question only when it feels natural.",
    ].join(" ");
  }

  // guided
  return [
    "You are a friendly English tutor and conversation partner.",
    "Reply in English and keep answers concise.",
    "If the user makes mistakes, gently correct them and provide a better natural version.",
    "Give brief guidance to help the user say it correctly.",
    "Then continue the conversation with a short follow-up question.",
  ].join(" ");
}

export class AiController {
  static async chat(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const { message, history, mode } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message required" });
    }

    const cleanedHistory = normalizeHistory(history);
    const conversationMode = normalizeMode(mode);

    try {
      const apiKey = await getApiKeyForUser(userId);
      const client = getClientForKey(apiKey);
      const modelName =
        typeof config.geminiModel === "string" && config.geminiModel.trim()
          ? config.geminiModel.trim()
          : "gemini-1.5-flash";
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: getSystemInstruction(conversationMode),
      });

      const chat = model.startChat({
        history: cleanedHistory.map((h) => ({
          role: h.role,
          parts: [{ text: h.content }],
        })),
      });

      const result = await chat.sendMessage(message.trim());
      const reply = result.response.text() || "";

      return res.json({
        reply,
      });
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" ? err.message : "AI request failed";
      console.error("AI chat error:", msg);
      const isConfigError =
        msg.toLowerCase().includes("api key") ||
        msg.toLowerCase().includes("not configured");
      return res.status(isConfigError ? 400 : 500).json({ error: msg });
    }
  }

  static async replySuggestions(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const { message, history, maxSuggestions } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message required" });
    }

    const cleanedHistory = normalizeHistory(history).slice(-8);
    const max =
      typeof maxSuggestions === "number" && maxSuggestions > 0
        ? Math.min(8, Math.floor(maxSuggestions))
        : 5;

    try {
      const apiKey = await getApiKeyForUser(userId);
      const client = getClientForKey(apiKey);
      const modelName =
        typeof config.geminiModel === "string" && config.geminiModel.trim()
          ? config.geminiModel.trim()
          : "gemini-1.5-flash";

      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction:
          "You generate short, natural English reply suggestions for the user. Return ONLY a JSON array of strings, no markdown, no explanation.",
      });

      const contextLines = cleanedHistory
        .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
        .join("\n");

      const prompt = `Conversation context (most recent last):\n${contextLines}\n\nAssistant just said:\n${message.trim()}\n\nTask: Provide ${max} short reply suggestions the user can say next in English. Return only a JSON array of strings.`;

      const result = await model.generateContent(prompt);
      const raw = (result.response.text() || "").trim();

      let suggestions: string[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          suggestions = parsed
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter(Boolean);
        }
      } catch {
        // Fallback: accept line-based output.
        suggestions = raw
          .split(/\r?\n/)
          .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
          .filter(Boolean);
      }

      suggestions = suggestions.slice(0, max);
      if (suggestions.length === 0) {
        suggestions = ["Could you explain that again in simpler words?"];
      }

      return res.json({ suggestions });
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" ? err.message : "AI request failed";
      console.error("AI suggestions error:", msg);
      const isConfigError =
        msg.toLowerCase().includes("api key") ||
        msg.toLowerCase().includes("not configured");
      return res.status(isConfigError ? 400 : 500).json({ error: msg });
    }
  }

  static async translate(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const { text, targetLanguage } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text required" });
    }

    const target =
      typeof targetLanguage === "string" && targetLanguage.trim()
        ? targetLanguage.trim()
        : "vi";

    // Basic guardrail to avoid very large prompts.
    const trimmed = text.trim();
    if (trimmed.length > 8000) {
      return res.status(400).json({ error: "text too long" });
    }

    try {
      const apiKey = await getApiKeyForUser(userId);
      const client = getClientForKey(apiKey);
      const modelName =
        typeof config.geminiModel === "string" && config.geminiModel.trim()
          ? config.geminiModel.trim()
          : "gemini-1.5-flash";
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction:
          "You are a translation engine. Translate faithfully, preserve formatting (lists, line breaks). Return only the translated text, no extra commentary.",
      });

      const prompt = `Translate the following text to ${target}:
\n${trimmed}`;
      const result = await model.generateContent(prompt);
      const translation = result.response.text() || "";

      return res.json({ translation: translation.trim() });
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" ? err.message : "AI request failed";
      console.error("AI translate error:", msg);
      const isConfigError =
        msg.toLowerCase().includes("api key") ||
        msg.toLowerCase().includes("not configured");
      return res.status(isConfigError ? 400 : 500).json({ error: msg });
    }
  }
}
