"use server";

/**
 * @fileOverview A flow for generating speaking exercises.
 * - generateSpeakingExercise - A function that creates a role-play scenario.
 */

import { ai, getTextModel } from "@/ai/genkit";
import {
  GenerateSpeakingExerciseInputSchema,
  GenerateSpeakingExerciseOutputSchema,
  type GenerateSpeakingExerciseInput,
  type GenerateSpeakingExerciseOutput,
} from "./schemas";

export async function generateSpeakingExercise(
  input: GenerateSpeakingExerciseInput
): Promise<GenerateSpeakingExerciseOutput> {
  return generateSpeakingExerciseFlow(input);
}

const promptText = `You are an English teacher creating a role-play exercise. The topic is "{{topic}}".

Create a scenario and a short dialogue script for two roles: "You" (the student) and another role (e.g., "Friend", "Interviewer", "Cashier").

The script should have 4-6 turns. For the "You" role, provide a clear instruction or prompt for what the student should say. For the other role, provide a specific line.

{{#if focusPoints}}
Please make sure the dialogue incorporates the following focus points: {{{focusPoints}}}.
{{/if}}

Topic: {{{topic}}}
`;

const generateSpeakingExerciseFlow = ai.defineFlow(
  {
    name: "generateSpeakingExerciseFlow",
    inputSchema: GenerateSpeakingExerciseInputSchema,
    outputSchema: GenerateSpeakingExerciseOutputSchema,
  },
  async (input) => {
    const model = getTextModel();
    try {
      const { output } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: {
          schema: GenerateSpeakingExerciseOutputSchema,
          format: "json",
        },
      });
      if (!output) throw new Error("Primary model returned no output.");
      return output;
    } catch (error) {
      console.warn(
        "Primary model failed for speaking exercise. Retrying with fallback model.",
        error
      );
      const { output: fallbackOutput } = await ai.generate({
        model,
        prompt: { text: promptText, input },
        output: {
          schema: GenerateSpeakingExerciseOutputSchema,
          format: "json",
        },
      });
      if (!fallbackOutput)
        throw new Error(
          "Fallback model also returned no output for speaking exercise."
        );
      return fallbackOutput;
    }
  }
);
