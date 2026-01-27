import { getTextModel } from "./genkit";

type GenerateParams<TOutput> = {
  ai: any; // Genkit runtime instance returned by createAi()
  prompt: string;
  output: { schema: any };
  preferredModel?: string;
  candidates?: string[];
  // Allow passing any extra Genkit generate options (e.g., temperature).
  options?: Record<string, any>;
};

const DEFAULT_TEXT_MODELS = [
  // Keep this list to models that are commonly available for GoogleAI keys.
  "googleai/gemini-2.5-flash",
  "googleai/gemini-2.0-flash",
  "googleai/gemini-2.0-flash-001",
  "googleai/gemini-2.0-flash-lite",
  "googleai/gemini-2.0-flash-lite-001",
  "googleai/gemini-flash-latest",
];

const ensureModelPrefix = (raw?: string | null) => {
  const val = (raw || "").trim().replace(/^"|"$/g, "");
  if (!val) return "";
  if (val.startsWith("googleai/")) return val;
  if (val.startsWith("models/")) return val.replace(/^models\//, "googleai/");
  return `googleai/${val}`;
};

const isNotFoundError = (err: any) => {
  const msg = String(err?.message || err || "");
  return /not\s*found/i.test(msg) || String((err as any)?.code) === "404";
};

const isApiKeyInvalidError = (err: any) => {
  const msg = String(err?.message || err || "");
  const status = (err as any)?.status;
  const details = (err as any)?.errorDetails;
  const reason = Array.isArray(details)
    ? details.find((d: any) => d?.reason)?.reason
    : undefined;

  return (
    status === 400 &&
    (reason === "API_KEY_INVALID" || /api\s*key\s*not\s*valid/i.test(msg))
  );
};

const dedupe = (list: string[]) => Array.from(new Set(list.filter(Boolean)));

const buildModelList = (preferred?: string, extra?: string[]) => {
  const normalizedPreferred = ensureModelPrefix(preferred || getTextModel());
  const normalizedExtras = (extra || []).map(ensureModelPrefix);
  return dedupe([
    normalizedPreferred,
    ...normalizedExtras,
    ...DEFAULT_TEXT_MODELS,
  ]);
};

/**
 * Try generation across a list of Gemini text models, stopping on the first
 * success and ignoring NOT_FOUND errors for unsupported models.
 */
export async function generateWithAutoModel<TOutput = any>(
  params: GenerateParams<TOutput>,
): Promise<{ output: TOutput; modelUsed: string }> {
  const models = buildModelList(params.preferredModel, params.candidates);
  let lastErr: any;

  for (const model of models) {
    try {
      const { output } = await params.ai.generate({
        model,
        prompt: params.prompt,
        output: params.output,
        ...(params.options || {}),
      } as any);
      if (output) return { output, modelUsed: model };
    } catch (err: any) {
      lastErr = err;
      if (isApiKeyInvalidError(err)) {
        throw new Error(
          "Gemini API key is missing/invalid. Set a valid GEMINI_API_KEY in the server environment or provide a valid per-user geminiApiKey in Settings.",
        );
      }
      if (!isNotFoundError(err)) throw err;
      console.warn(`[model-selector] model not found: ${model}; trying next`);
    }
  }

  throw lastErr || new Error("All models failed for generateWithAutoModel");
}
