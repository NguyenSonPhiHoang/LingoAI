import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

const normalizeApiKey = (val?: string | null) => {
  const trimmed = String(val ?? "")
    .trim()
    .replace(/^"|"$/g, "");
  return trimmed.length ? trimmed : undefined;
};

const SYSTEM_KEY = normalizeApiKey(process.env.GEMINI_API_KEY);

export const ai = genkit({
  plugins: [SYSTEM_KEY ? googleAI({ apiKey: SYSTEM_KEY }) : googleAI()],
});

// Build a per-request AI client (kept for compatibility with existing flows).
export const createAi = (apiKey?: string) => {
  const key = normalizeApiKey(apiKey) || SYSTEM_KEY;
  return genkit({ plugins: [key ? googleAI({ apiKey: key }) : googleAI()] });
};

// Normalize model name for Genkit.
// The @genkit-ai/googleai plugin registers models as `googleai/<modelId>`.
// Accept env values in any of these forms and normalize to `googleai/<modelId>`:
// - googleai/gemini-2.5-flash
// - models/gemini-2.5-flash
// - gemini-2.5-flash
const ensureModelPrefix = (
  val: string | undefined | null,
  fallback: string
) => {
  const raw = (val || fallback || "").trim().replace(/^"|"$/g, "");
  if (!raw) return fallback;
  if (raw.startsWith("googleai/")) return raw;
  if (raw.startsWith("models/")) return raw.replace(/^models\//, "googleai/");
  return `googleai/${raw}`;
};

const DEFAULT_TEXT_MODEL = "googleai/gemini-2.0-flash";
// Audio generation (responseModalities: ["AUDIO"]) requires a TTS-capable model.
const DEFAULT_TTS_MODEL = "googleai/gemini-2.5-flash-preview-tts";

export const getTextModel = () => {
  const configured = ensureModelPrefix(
    process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_NAME,
    DEFAULT_TEXT_MODEL
  );
  console.debug("[genkit] getTextModel ->", configured);
  return configured;
};

export const getTtsModel = () =>
  ensureModelPrefix(process.env.GEMINI_TTS_MODEL, DEFAULT_TTS_MODEL);

// Helper to create a GoogleAI model instance with a user-provided API key
// or falling back to the environment variable `GEMINI_API_KEY`.
export function getGoogleModel(modelName?: string, apiKey?: string) {
  const configured = process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_NAME;
  const finalModel = ensureModelPrefix(
    modelName || configured,
    DEFAULT_TEXT_MODEL
  );
  const key = normalizeApiKey(apiKey) || SYSTEM_KEY;
  if (!key)
    throw new Error("No Gemini API key provided (user key or GEMINI_API_KEY)");
  return googleAI.model(finalModel, { apiKey: key });
}
