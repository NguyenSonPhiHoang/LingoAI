'use server';

/**
 * @fileOverview A flow for extracting vocabulary from a document.
 *
 * - extractVocabularyFromFile - A function that extracts vocabulary.
 * - ExtractVocabularyInput - The input type for the extractVocabularyFromFile function.
 * - ExtractVocabularyOutput - The return type for the extractVocabularyFromFile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractVocabularyInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The text content of the document to extract vocabulary from.'),
});
export type ExtractVocabularyInput = z.infer<typeof ExtractVocabularyInputSchema>;

export const VocabularyEntrySchema = z.object({
    term: z.string().describe('The vocabulary word or term.'),
    definition: z.string().describe('A clear and concise definition of the term.'),
    sentence: z.string().describe('An example sentence using the term in context.'),
});
export type VocabularyEntry = z.infer<typeof VocabularyEntrySchema>;

const ExtractVocabularyOutputSchema = z.object({
  vocabulary: z
    .array(VocabularyEntrySchema)
    .describe('A list of vocabulary entries extracted from the document.'),
});
export type ExtractVocabularyOutput = z.infer<
  typeof ExtractVocabularyOutputSchema
>;

export async function extractVocabularyFromFile(
  input: ExtractVocabularyInput
): Promise<ExtractVocabularyOutput> {
  return extractVocabularyFromFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractVocabularyPrompt',
  input: {schema: ExtractVocabularyInputSchema},
  output: {schema: ExtractVocabularyOutputSchema},
  prompt: `You are an English language expert. Your task is to extract a list of vocabulary words from the provided text. For each word, you must provide a clear definition and a contextual example sentence based on the document.

Ignore common words and focus on words that are likely to be new to an English learner.

Document Content:
{{{documentContent}}}
`,
});

const extractVocabularyFromFileFlow = ai.defineFlow(
  {
    name: 'extractVocabularyFromFileFlow',
    inputSchema: ExtractVocabularyInputSchema,
    outputSchema: ExtractVocabularyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
