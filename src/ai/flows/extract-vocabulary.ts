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
  prompt: `You are an English language expert. Your task is to extract a list of vocabulary words, phrases, or sentences from the provided text. For each item, you must provide:
1. A clear English definition.
2. Its part of speech (e.g., Noun, Verb, Adjective, Phrase, Sentence).
3. Its International Phonetic Alphabet (IPA) pronunciation. If it's a phrase or sentence, provide pronunciation for the key words.
4. A contextual example sentence based on the document.
5. A Vietnamese definition.
6. The Vietnamese translation of the example sentence.

Ignore common words and focus on items that are likely to be new to an English learner.

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
