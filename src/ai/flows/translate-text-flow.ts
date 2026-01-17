"use server";

/**
 * @fileOverview A flow for translating text to Vietnamese.
 *
 * - translateText - A function that translates text.
 */

import { createAi, getTextModel } from "@/ai/genkit";
import { generateWithAutoModel } from "@/ai/model-selector";
import {
  TranslateTextInputSchema,
  TranslateTextOutputSchema,
  type TranslateTextInput,
  type TranslateTextOutput,
} from "./schemas";

export async function translateText(
  input: TranslateTextInput
): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const translateTextFlow = createAi().defineFlow(
  {
    name: "translateTextFlow",
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async ({ text, geminiApiKey }) => {
    const runtimeAi = createAi(geminiApiKey);
    const { output } = await generateWithAutoModel({
      ai: runtimeAi,
      preferredModel: getTextModel(),
      candidates: ["models/gemini-2.0-flash"],
      prompt: `Translate the following English text to Vietnamese. Provide only the translation, without any additional explanations or context.

Text to translate:
"${text}"
`,
      output: { schema: TranslateTextOutputSchema },
    });

    return { translation: output?.translation || "" };
  }
);
