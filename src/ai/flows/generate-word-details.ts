'use server';

/**
 * @fileOverview A flow for generating details for a single vocabulary word.
 *
 * - generateWordDetails - A function that generates word details.
 * - GenerateWordDetailsInput - The input type for the function.
 * - GenerateWordDetailsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateWordDetailsInputSchema,
  GenerateWordDetailsOutputSchema,
  type GenerateWordDetailsInput,
  type GenerateWordDetailsOutput,
} from './schemas';

export async function generateWordDetails(
  input: GenerateWordDetailsInput
): Promise<GenerateWordDetailsOutput> {
  return generateWordDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWordDetailsPrompt',
  input: {schema: GenerateWordDetailsInputSchema},
  output: {schema: GenerateWordDetailsOutputSchema},
  prompt: `You are an English language expert. Your task is to provide details for the given vocabulary word.

For the word "{{term}}", provide:
1.  A clear and concise definition.
2.  Its International Phonetic Alphabet (IPA) pronunciation.
3.  A contextual example sentence.
`,
});

const generateWordDetailsFlow = ai.defineFlow(
  {
    name: 'generateWordDetailsFlow',
    inputSchema: GenerateWordDetailsInputSchema,
    outputSchema: GenerateWordDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
