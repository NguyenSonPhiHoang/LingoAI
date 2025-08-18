'use server';

/**
 * @fileOverview A flow for generating feedback on a user's written text.
 * - generateWritingFeedback - A function that provides corrections and suggestions.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateWritingFeedbackInputSchema,
  GenerateWritingFeedbackOutputSchema,
  type GenerateWritingFeedbackInput,
  type GenerateWritingFeedbackOutput,
} from './schemas';

export async function generateWritingFeedback(
  input: GenerateWritingFeedbackInput
): Promise<GenerateWritingFeedbackOutput> {
  return generateWritingFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWritingFeedbackPrompt',
  input: {schema: GenerateWritingFeedbackInputSchema},
  output: {schema: GenerateWritingFeedbackOutputSchema},
  prompt: `You are an English teacher providing feedback on a writing exercise. The user was given a Vietnamese prompt, an English hint, and they have written an English sentence.

Your task is to:
1.  Analyze the user's text for grammatical errors, awkward phrasing, or incorrect vocabulary usage.
2.  Provide a corrected version of the user's text.
3.  Give a concise and helpful explanation of the changes you made, focusing on the most important learning points. Explain why the original was incorrect and why the corrected version is better.

Vietnamese Prompt: "{{vietnamesePrompt}}"
English Hint: "{{englishHint}}"
User's Written Text: "{{userWrittenText}}"

Generate the feedback.
`,
});

const generateWritingFeedbackFlow = ai.defineFlow(
  {
    name: 'generateWritingFeedbackFlow',
    inputSchema: GenerateWritingFeedbackInputSchema,
    outputSchema: GenerateWritingFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
