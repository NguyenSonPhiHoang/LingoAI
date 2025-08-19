
'use server';

/**
 * @fileOverview A flow for generating feedback on an incorrect fill-in-the-blank vocabulary answer.
 * - generateVocabularyFeedback - A function that explains why a vocabulary choice is wrong.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateVocabularyFeedbackInputSchema,
  GenerateVocabularyFeedbackOutputSchema,
  type GenerateVocabularyFeedbackInput,
  type GenerateVocabularyFeedbackOutput,
} from './schemas';

export async function generateVocabularyFeedback(
  input: GenerateVocabularyFeedbackInput
): Promise<GenerateVocabularyFeedbackOutput> {
  return generateVocabularyFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVocabularyFeedbackPrompt',
  input: {schema: GenerateVocabularyFeedbackInputSchema},
  output: {schema: GenerateVocabularyFeedbackOutputSchema},
  prompt: `You are an English teacher providing feedback on a fill-in-the-blank vocabulary question. The user has selected an incorrect word. Your task is to explain why their choice is wrong in the context of the sentence and why the correct word is a better fit.

Keep the explanation clear, concise, and helpful.

Sentence with blank: "{{sentenceWithBlank}}"
User's Incorrect Word: "{{userAnswerTerm}}"
Correct Word: "{{correctAnswerTerm}}"
Definition of Correct Word: "{{correctAnswerDefinition}}"

Explain the user's mistake.
`,
});

const generateVocabularyFeedbackFlow = ai.defineFlow(
  {
    name: 'generateVocabularyFeedbackFlow',
    inputSchema: GenerateVocabularyFeedbackInputSchema,
    outputSchema: GenerateVocabularyFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
