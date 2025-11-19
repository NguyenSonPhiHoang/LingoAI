"use server";

/**
 * @fileOverview A flow for generating a review test based on completed lessons.
 * - generateReviewTest - A function that creates a set of questions.
 */

import { ai } from "@/ai/genkit";
import {
  GenerateReviewTestInputSchema,
  GenerateReviewTestOutputSchema,
  type GenerateReviewTestInput,
  type GenerateReviewTestOutput,
} from "./schemas";

export async function generateReviewTest(
  input: GenerateReviewTestInput
): Promise<GenerateReviewTestOutput> {
  return generateReviewTestFlow(input);
}

const prompt = ai.definePrompt({
  name: "generateReviewTestPrompt",
  model: "vertexai/gemini-1.5-flash",
  input: { schema: GenerateReviewTestInputSchema },
  output: { schema: GenerateReviewTestOutputSchema },
  prompt: `You are an expert English assessment creator. Your task is to create a review test based on the content of previously completed lessons.

The test should consist of two sections:
1.  **Vocabulary Review (10 questions):** Create exactly 10 multiple-choice, fill-in-the-blank questions using the provided vocabulary list. Each question should have a sentence with a blank, and four options (one correct, three plausible distractors).
2.  **Reading Comprehension (5 questions):** Based on the provided reading passages from the completed lessons, create exactly 5 multiple-choice comprehension questions. Each question should have four options and one clear correct answer.

Ensure the questions accurately reflect the provided content.

**Vocabulary List:**
{{#each vocabulary}}
- Term: {{{this.term}}}
- Definition: {{{this.definition}}}
{{/each}}

**Reading Passages:**
{{#each passages}}
- {{{this}}}
{{/each}}

Generate the complete review test now.
`,
});

const generateReviewTestFlow = ai.defineFlow(
  {
    name: "generateReviewTestFlow",
    inputSchema: GenerateReviewTestInputSchema,
    outputSchema: GenerateReviewTestOutputSchema,
  },
  async (input) => {
    if (input.vocabulary.length === 0 && input.passages.length === 0) {
      throw new Error(
        "Cannot generate a review test without vocabulary or passages from completed lessons."
      );
    }
    const { output } = await prompt(input);
    return output!;
  }
);
