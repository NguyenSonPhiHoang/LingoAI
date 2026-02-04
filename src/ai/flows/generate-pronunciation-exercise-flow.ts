"use server";

/**
 * @fileOverview A flow for generating pronunciation exercises.
 * - generatePronunciationExercise - A function that creates pronunciation drills.
 */

import { ai, getTextModel } from "@/ai/genkit";
import {
  GeneratePronunciationExerciseInputSchema,
  GeneratePronunciationExerciseOutputSchema,
  type GeneratePronunciationExerciseInput,
  type GeneratePronunciationExerciseOutput,
} from "./schemas";

export async function generatePronunciationExercise(
  input: GeneratePronunciationExerciseInput,
): Promise<GeneratePronunciationExerciseOutput> {
  return generatePronunciationExerciseFlow(input);
}

const promptText = `You are an expert English pronunciation coach. Your task is to generate a set of three exercises for a user at the "{{userLevel}}" level, focusing on the topic of "{{topic}}".

The exercises should correspond to three areas of pronunciation.

1.  **Word Pronunciation Exercise**: Create a "minimal pairs" drill. Provide 3 pairs of words that differ by only one key sound. For each word, provide its IPA pronunciation. This helps the user distinguish between similar sounds.
2.  **Sentence Pronunciation Exercise**: Create a "repeat the sentence" drill. Provide 2 sentences for the user to practice their connected speech and rhythm. The sentences should be natural-sounding.
3.  **Intonation Exercise**: Create a "choose the correct intonation" drill. Provide a single sentence and describe two scenarios (e.g., one as a genuine question, one as a statement of surprise). Ask the user to identify which scenario would use rising intonation and which would use falling intonation.

{{#if focusPoints}}
The exercises should be designed to help the student practice the following specific sounds or patterns: {{{focusPoints}}}.
{{else}}
The exercises should focus on common pronunciation challenges for English learners related to the topic.
{{/if}}

Topic: {{{topic}}}
Student Level: {{{userLevel}}}
`;

const generatePronunciationExerciseFlow = ai.defineFlow(
  {
    name: "generatePronunciationExerciseFlow",
    inputSchema: GeneratePronunciationExerciseInputSchema,
    outputSchema: GeneratePronunciationExerciseOutputSchema,
  },
  async (input) => {
    const model = getTextModel();
    try {
      const { output } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: {
          schema: GeneratePronunciationExerciseOutputSchema,
          format: "json",
        },
      } as any);
      if (!output) throw new Error("Primary model returned no output.");
      return output;
    } catch (error) {
      console.warn(
        "Primary model failed for pronunciation exercise. Retrying with fallback model.",
        error,
      );
      const { output: fallbackOutput } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: {
          schema: GeneratePronunciationExerciseOutputSchema,
          format: "json",
        },
      } as any);
      if (!fallbackOutput)
        throw new Error(
          "Fallback model also returned no output for pronunciation exercise.",
        );
      return fallbackOutput;
    }
  },
);
