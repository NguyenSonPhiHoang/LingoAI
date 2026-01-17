"use server";

/**
 * @fileOverview A flow for generating a reading comprehension exercise.
 * - generateReadingExercise - A function that creates questions for a passage.
 */

import { ai, getTextModel } from "@/ai/genkit";
import {
  GenerateReadingExerciseInputSchema,
  GenerateReadingExerciseOutputSchema,
  type GenerateReadingExerciseInput,
  type GenerateReadingExerciseOutput,
} from "./schemas";

export async function generateReadingExercise(
  input: GenerateReadingExerciseInput
): Promise<GenerateReadingExerciseOutput> {
  return generateReadingExerciseFlow(input);
}

const promptText = `You are an English teacher. Based on the following reading passage, create 5 multiple-choice comprehension questions. Each question must have 4 options, with one clear correct answer.

{{#if focusPoints}}
The questions should test the reader's understanding of these specific points: {{{focusPoints}}}.
{{/if}}

Reading Passage:
{{{passage}}}
`;

const generateReadingExerciseFlow = ai.defineFlow(
  {
    name: "generateReadingExerciseFlow",
    inputSchema: GenerateReadingExerciseInputSchema,
    outputSchema: GenerateReadingExerciseOutputSchema,
  },
  async (input) => {
    const model = getTextModel();
    try {
      const { output } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: { schema: GenerateReadingExerciseOutputSchema, format: "json" },
      });
      if (!output) throw new Error("Primary model returned no output.");
      return output;
    } catch (error) {
      console.warn(
        "Primary model failed for reading exercise. Retrying with fallback model.",
        error
      );
      const { output: fallbackOutput } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: { schema: GenerateReadingExerciseOutputSchema, format: "json" },
      });
      if (!fallbackOutput)
        throw new Error(
          "Fallback model also returned no output for reading exercise."
        );
      return fallbackOutput;
    }
  }
);
