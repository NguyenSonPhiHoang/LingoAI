"use server";

/**
 * @fileOverview A flow for extracting vocabulary from a document or an image.
 *
 * - extractVocabularyFromFile - A function that extracts vocabulary.
 */

import { ai } from "@/ai/genkit";
import {
  ExtractVocabularyInputSchema,
  ExtractVocabularyOutputSchema,
  type ExtractVocabularyInput,
  type ExtractVocabularyOutput,
} from "./schemas";

export async function extractVocabularyFromFile(
  input: ExtractVocabularyInput
): Promise<ExtractVocabularyOutput> {
  return extractVocabularyFromFileFlow(input);
}

const prompt = ai.definePrompt({
  name: "extractVocabularyPrompt",
  model: "vertexai/gemini-1.5-flash",
  input: { schema: ExtractVocabularyInputSchema },
  output: { schema: ExtractVocabularyOutputSchema },
  prompt: `You are an English language expert. Your task is to extract a list of vocabulary words, phrases, or sentences from the provided text content or image. For each item, you must provide:
1. The vocabulary term, phrase, or sentence.
2. Its International Phonetic Alphabet (IPA) pronunciation. If it's a phrase or sentence, provide pronunciation for the key words.
3. Its part of speech (e.g., Noun, Verb, Adjective, Phrase, Sentence).
4. A clear, concise English definition.
5. A contextual example sentence based on the document.
6. A Vietnamese definition.
7. The Vietnamese translation of the example sentence.


Ignore common words and focus on items that are likely to be new to an English learner. Extract at least 10 items if possible, but no more than 50.

{{#if documentContent}}
Document Content:
{{{documentContent}}}
{{/if}}

{{#if imageDataUri}}
Image Content:
{{media url=imageDataUri}}
{{/if}}
`,
});

const extractVocabularyFromFileFlow = ai.defineFlow(
  {
    name: "extractVocabularyFromFileFlow",
    inputSchema: ExtractVocabularyInputSchema,
    outputSchema: ExtractVocabularyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
