
'use server';

/**
 * @fileOverview A flow for generating writing exercises.
 * - generateWritingExercise - A function that creates writing prompts.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateWritingExerciseInputSchema,
  GenerateWritingExerciseOutputSchema,
  type GenerateWritingExerciseInput,
  type GenerateWritingExerciseOutput,
} from './schemas';

export async function generateWritingExercise(
  input: GenerateWritingExerciseInput
): Promise<GenerateWritingExerciseOutput> {
  return generateWritingExerciseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWritingExercisePrompt',
  input: {schema: GenerateWritingExerciseInputSchema},
  output: {schema: GenerateWritingExerciseOutputSchema},
  prompt: `You are an English teacher. Create 3 writing prompts for a student to practice writing in English. The student's level is {{userLevel}} and the lesson topic is "{{topic}}".

Each prompt must consist of:
1.  A sentence in Vietnamese for the student to translate or use as a basis for their writing.
2.  An English hint, which MUST be a grammar structure or syntax advice (e.g., "Use the past continuous tense", "Try using a relative clause with 'which'").
3.  An example of a good English answer that uses the hint.

{{#if focusPoints}}
The prompts and hints should be designed to help the student practice the following: {{{focusPoints}}}.
{{else}}
The English hint should be a key grammar structure or syntax advice relevant to the topic and user level.
{{/if}}

Topic: {{{topic}}}
Student Level: {{{userLevel}}}
`,
});

const generateWritingExerciseFlow = ai.defineFlow(
  {
    name: 'generateWritingExerciseFlow',
    inputSchema: GenerateWritingExerciseInputSchema,
    outputSchema: GenerateWritingExerciseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
