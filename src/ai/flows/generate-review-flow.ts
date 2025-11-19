"use server";

/**
 * @fileOverview A flow for generating review exercises based on a list of vocabulary words.
 *
 * - generateReviewExercises - A function that generates review exercises.
 * - GenerateReviewInput - The input type for the generateReviewExercises function.
 * - GenerateReviewOutput - The return type for the generateReviewExercises function.
 */

import { ai } from "@/ai/genkit";
import {
  GenerateReviewInputSchema,
  GenerateReviewOutputSchema,
  type GenerateReviewInput,
  type GenerateReviewOutput,
} from "./schemas";

export async function generateReviewExercises(
  input: GenerateReviewInput
): Promise<GenerateReviewOutput> {
  return generateReviewFlow(input);
}

const prompt = ai.definePrompt({
  name: "generateReviewPrompt",
  model: "vertexai/gemini-1.5-flash",
  input: { schema: GenerateReviewInputSchema },
  output: { schema: GenerateReviewOutputSchema },
  prompt: `You are an AI English learning assistant. Your task is to generate review exercises based on a provided list of vocabulary words.

Generate exactly 10 matching questions and 10 fill-in-the-blank questions.

For matching questions, provide a term and four definition options, one of which is correct.
For fill-in-the-blank questions, provide a sentence with a blank (e.g., "___"), four term options (one correct and three plausible but incorrect distractors), and specify the correct term. The sentence should be different from the original example sentence for the word.

Vocabulary List:
{{#each words}}
- Term: {{{this.term}}}
- Definition: {{{this.definition}}}
- Example Sentence: {{{this.sentence}}}
{{/each}}

Generate the exercises based on these words.
`,
});

const generateReviewFlow = ai.defineFlow(
  {
    name: "generateReviewFlow",
    inputSchema: GenerateReviewInputSchema,
    outputSchema: GenerateReviewOutputSchema,
  },
  async (input) => {
    if (input.words.length === 0) {
      return {
        matchingQuestions: [],
        fillInTheBlankQuestions: [],
      };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
