"use server";

/**
 * @fileOverview A flow for generating details for a single vocabulary word, phrase, or sentence.
 *
 * - generateWordDetails - A function that generates word details.
 * - GenerateWordDetailsInput - The input type for the function.
 * - GenerateWordDetailsOutput - The return type for the function.
 */

import { createAi, getTextModel } from "@/ai/genkit";
import { generateWithAutoModel } from "@/ai/model-selector";
import {
  GenerateWordDetailsInputSchema,
  GenerateWordDetailsOutputSchema,
  type GenerateWordDetailsInput,
  type GenerateWordDetailsOutput,
} from "./schemas";

export async function generateWordDetails(
  input: GenerateWordDetailsInput
): Promise<GenerateWordDetailsOutput> {
  return generateWordDetailsFlow(input);
}

const generateWordDetailsFlow = createAi().defineFlow(
  {
    name: "generateWordDetailsFlow",
    inputSchema: GenerateWordDetailsInputSchema,
    outputSchema: GenerateWordDetailsOutputSchema,
  },
  async ({ term, geminiApiKey }) => {
    const runtimeAi = createAi(geminiApiKey);
    const configured = getTextModel();

    const promptText = `You are an English language expert. Your task is to provide details for the given vocabulary word, phrase, or sentence.

For the term "${term}", provide:
1.  A clear and concise definition in English.
2.  Its part of speech (e.g., Noun, Verb, Adjective, Phrase).
3.  Its International Phonetic Alphabet (IPA) pronunciation. If it's a phrase or sentence, provide pronunciation for the key words.
4.  A contextual example sentence.
5.  A clear and concise definition in Vietnamese.
6.  The example sentence translated into Vietnamese.
7.  A short list (fewer than 10) of the most common and relevant synonyms, if any.
8.  A short list (fewer than 10) of the most common and relevant antonyms, if any.
9.  If the term is a verb, provide its irregular forms (V1, V2, V3). If it is a regular verb, do not provide this field.
10. If the term is a single common English word (not a phrase/sentence), provide its common word-family forms across parts of speech as "wordForms" with optional keys: noun, verb, adjective, adverb. Only include a key if that form is commonly used; do not invent rare/forced forms.`;

    const { output } = await generateWithAutoModel({
      ai: runtimeAi,
      prompt: promptText,
      output: { schema: GenerateWordDetailsOutputSchema },
      preferredModel: configured,
      candidates: ["models/gemini-2.0-flash"],
    });

    return output;
  }
);
