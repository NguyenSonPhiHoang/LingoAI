
'use server';

/**
 * @fileOverview A flow for translating text to Vietnamese.
 *
 * - translateText - A function that translates text.
 */

import {ai} from '@/ai/genkit';
import {
  TranslateTextInputSchema,
  TranslateTextOutputSchema,
  type TranslateTextInput,
  type TranslateTextOutput,
} from './schemas';

export async function translateText(
  input: TranslateTextInput
): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTextPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `Translate the following English text to Vietnamese. Provide only the translation, without any additional explanations or context.

Text to translate:
"{{{text}}}"
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
