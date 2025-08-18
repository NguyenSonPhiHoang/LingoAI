'use server';

/**
 * @fileOverview A flow for extracting vocabulary from a document.
 *
 * - extractVocabularyFromFile - A function that extracts vocabulary.
 */

import {ai} from '@/ai/genkit';
import {
  ExtractVocabularyInputSchema,
  ExtractVocabularyOutputSchema,
  type ExtractVocabularyInput,
  type ExtractVocabularyOutput,
} from './schemas';

export async function extractVocabularyFromFile(
  input: ExtractVocabularyInput
): Promise<ExtractVocabularyOutput> {
  return extractVocabularyFromFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractVocabularyPrompt',
  input: {schema: ExtractVocabularyInputSchema},
  output: {schema: ExtractVocabularyOutputSchema},
  prompt: `You are an English language expert. Your task is to extract a list of vocabulary words from the provided text. For each word, you must provide a clear definition, a contextual example sentence based on the document, and its International Phonetic Alphabet (IPA) pronunciation.

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
