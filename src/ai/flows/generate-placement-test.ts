
'use server';

/**
 * @fileOverview A flow for generating a placement test to assess English level.
 * - generatePlacementTest - A function that creates a set of questions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {
  GeneratePlacementTestOutputSchema,
  PlacementTestQuestionSchema,
  type GeneratePlacementTestOutput,
} from './schemas';

export async function generatePlacementTest(): Promise<GeneratePlacementTestOutput> {
  return generatePlacementTestFlow();
}

const prompt = ai.definePrompt({
  name: 'generatePlacementTestPrompt',
  output: {schema: GeneratePlacementTestOutputSchema},
  prompt: `You are an expert English language assessment creator. Your task is to create a comprehensive placement test to determine a user's English proficiency level (Beginner, Intermediate, Advanced).

You must generate exactly 30 multiple-choice questions in total.
The questions should be a mix of grammar and vocabulary.
- 10 questions must be at the 'beginner' level (A1/A2).
- 10 questions must be at the 'intermediate' level (B1/B2).
- 10 questions must be at the 'advanced' level (C1/C2).

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
    name: 'generatePlacementTestFlow',
    outputSchema: GeneratePlacementTestOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
