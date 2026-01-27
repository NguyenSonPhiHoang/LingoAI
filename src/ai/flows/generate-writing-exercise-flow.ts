"use server";

/**
 * @fileOverview A flow for generating writing exercises.
 * - generateWritingExercise - A function that creates writing prompts.
 */

import { ai, getTextModel } from "@/ai/genkit";
import {
  GenerateWritingExerciseInputSchema,
  GenerateWritingExerciseOutputSchema,
  type GenerateWritingExerciseInput,
  type GenerateWritingExerciseOutput,
} from "./schemas";

export async function generateWritingExercise(
  input: GenerateWritingExerciseInput,
): Promise<GenerateWritingExerciseOutput> {
  return generateWritingExerciseFlow(input);
}

const promptText = `You are an English teacher. Create 3 writing prompts for a student to practice writing in English. The student's level is {{userLevel}} and the lesson topic is "{{topic}}".

Each prompt must consist of:
1.  A sentence in Vietnamese for the student to translate or use as a basis for their writing.
2.  An English hint, which MUST be a grammar structure or syntax advice (e.g., "Use the past continuous tense", "Try using a relative clause with 'which'").
3.  An example of a good English answer that uses the hint.

{{#if focusPoints}}
The prompts and hints should be designed to help the student practice the following: {{{focusPoints}}}.
{{else}}
The English hint should be a key grammar structure or syntax advice relevant to the topic and user level.
{{/if}}

Topic: {{{topic}}}
Student Level: {{{userLevel}}}
`;

const generateWritingExerciseFlow = ai.defineFlow(
  {
    name: "generateWritingExerciseFlow",
    inputSchema: GenerateWritingExerciseInputSchema,
    outputSchema: GenerateWritingExerciseOutputSchema,
  },
  async (input) => {
    const model = getTextModel();
    try {
      const { output } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: { schema: GenerateWritingExerciseOutputSchema, format: "json" },
      } as any);
      if (!output) throw new Error("Primary model returned no output.");
      return output;
    } catch (error) {
      console.warn(
        "Primary model failed for writing exercise. Retrying with fallback model.",
        error,
      );
      const { output: fallbackOutput } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: { schema: GenerateWritingExerciseOutputSchema, format: "json" },
      } as any);
      if (!fallbackOutput)
        throw new Error(
          "Fallback model also returned no output for writing exercise.",
        );
      return fallbackOutput;
    }
  },
);
