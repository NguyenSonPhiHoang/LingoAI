
'use server';

/**
 * @fileOverview A flow for generating details for a single vocabulary word, phrase, or sentence.
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
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateWordDetailsInputSchema},
  output: {schema: GenerateWordDetailsOutputSchema},
  prompt: `You are an English language expert. Your task is to provide details for the given vocabulary word, phrase, or sentence.

For the term "{{term}}", provide:
1.  A clear and concise definition in English.
2.  Its part of speech (e.g., Noun, Verb, Adjective, Phrase).
3.  Its International Phonetic Alphabet (IPA) pronunciation. If it's a phrase or sentence, provide pronunciation for the key words.
4.  A contextual example sentence.
5.  A clear and concise definition in Vietnamese.
6.  The example sentence translated into Vietnamese.
7.  A list of common synonyms, if any.
8.  A list of common antonyms, if any.
9.  If the term is a verb, provide its irregular forms (V1, V2, V3). If it is a regular verb, do not provide this field.
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
