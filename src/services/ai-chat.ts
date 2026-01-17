"use client";

import { apiPost } from "./api";

export type AiChatRole = "user" | "model";

export type AiConversationMode = "natural" | "guided";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export async function sendAiChatMessage(input: {
  message: string;
  history: AiChatMessage[];
  mode?: AiConversationMode;
}): Promise<{ reply: string }> {
  return apiPost<{ reply: string }>("/api/ai/chat", {
    message: input.message,
    history: input.history,
    mode: input.mode,
  });
}

export async function translateAiText(input: {
  text: string;
  targetLanguage?: string;
}): Promise<{ translation: string }> {
  return apiPost<{ translation: string }>("/api/ai/translate", {
    text: input.text,
    targetLanguage: input.targetLanguage || "vi",
  });
}

export async function getAiReplySuggestions(input: {
  message: string;
  history: AiChatMessage[];
  maxSuggestions?: number;
}): Promise<{ suggestions: string[] }> {
  return apiPost<{ suggestions: string[] }>("/api/ai/reply-suggestions", {
    message: input.message,
    history: input.history,
    maxSuggestions: input.maxSuggestions ?? 5,
  });
}
