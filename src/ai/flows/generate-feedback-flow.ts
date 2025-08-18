
'use server';

/**
 * @fileOverview A flow for generating feedback on an incorrect answer.
 * - generateFeedbackForIncorrectAnswer - A function that explains why an answer is wrong.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateFeedbackInputSchema,
  GenerateFeedbackOutputSchema,
  type GenerateFeedbackInput,
  type GenerateFeedbackOutput,
} from './schemas';

export async function generateFeedbackForIncorrectAnswer(
  input: GenerateFeedbackInput
): Promise<GenerateFeedbackOutput> {
  return generateFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFeedbackPrompt',
  input: {schema: GenerateFeedbackInputSchema},
  output: {schema: GenerateFeedbackOutputSchema},
  prompt: `You are an English teacher providing feedback on a reading comprehension question. The user has selected an incorrect answer. Your task is to explain why their answer is wrong and why the correct answer is right.

Provide a clear, concise, and helpful explanation. You can refer to specific parts of the reading passage to support your explanation.

Reading Passage:
"{{{passage}}}"

Question: "{{question}}"
Correct Answer: "{{correctAnswer}}"
User's Incorrect Answer: "{{userAnswer}}"

Explain the user's mistake.
`,
});

const generateFeedbackFlow = ai.defineFlow(
  {
    name: 'generateFeedbackFlow',
    inputSchema: GenerateFeedbackInputSchema,
    outputSchema: GenerateFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
