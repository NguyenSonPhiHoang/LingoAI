"use server";

/**
 * @fileOverview A flow for generating a placement test to assess English level.
 * - generatePlacementTest - A function that creates a set of questions.
 */

import { ai, getTextModel } from "@/ai/genkit";
import {
  GeneratePlacementTestInputSchema,
  GeneratePlacementTestOutputSchema,
  type GeneratePlacementTestInput,
  type GeneratePlacementTestOutput,
} from "./schemas";

export async function generatePlacementTest(
  input: GeneratePlacementTestInput
): Promise<GeneratePlacementTestOutput> {
  return generatePlacementTestFlow(input);
}

const textModel = getTextModel();

const prompt = ai.definePrompt({
  name: "generatePlacementTestPrompt",
  model: textModel,
  input: { schema: GeneratePlacementTestInputSchema },
  output: { schema: GeneratePlacementTestOutputSchema },
  prompt: `You are an expert English language assessment creator. Your task is to create a comprehensive placement test to determine a user's English proficiency level (Beginner, Intermediate, Advanced).

You must generate exactly {{numberOfQuestions}} multiple-choice questions in total.
The questions should be a mix of grammar and vocabulary.
Distribute the questions as evenly as possible across three difficulty levels: 'beginner' (A1/A2), 'intermediate' (B1/B2), and 'advanced' (C1/C2).

For each question, you must provide:
1.  The question text.
2.  Four unique options.
3.  The single correct option.
4.  The corresponding difficulty level ('beginner', 'intermediate', or 'advanced').

Ensure the questions cover a wide range of topics and grammatical structures appropriate for each level.
`,
});

const generatePlacementTestFlow = ai.defineFlow(
  {
    name: "generatePlacementTestFlow",
    inputSchema: GeneratePlacementTestInputSchema,
    outputSchema: GeneratePlacementTestOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
