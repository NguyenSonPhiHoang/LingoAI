
'use server';

/**
 * @fileOverview A flow for generating speaking exercises.
 * - generateSpeakingExercise - A function that creates a role-play scenario.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateSpeakingExerciseInputSchema,
  GenerateSpeakingExerciseOutputSchema,
  type GenerateSpeakingExerciseInput,
  type GenerateSpeakingExerciseOutput,
} from './schemas';

export async function generateSpeakingExercise(
  input: GenerateSpeakingExerciseInput
): Promise<GenerateSpeakingExerciseOutput> {
  return generateSpeakingExerciseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSpeakingExercisePrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateSpeakingExerciseInputSchema},
  output: {schema: GenerateSpeakingExerciseOutputSchema},
  prompt: `You are an English teacher creating a role-play exercise. The topic is "{{topic}}".

Create a scenario and a short dialogue script for two roles: "You" (the student) and another role (e.g., "Friend", "Interviewer", "Cashier").

The script should have 4-6 turns. For the "You" role, provide a clear instruction or prompt for what the student should say. For the other role, provide a specific line.

{{#if focusPoints}}
Please make sure the dialogue incorporates the following focus points: {{{focusPoints}}}.
{{/if}}

Topic: {{{topic}}}
`,
});

const generateSpeakingExerciseFlow = ai.defineFlow(
  {
    name: 'generateSpeakingExerciseFlow',
    inputSchema: GenerateSpeakingExerciseInputSchema,
    outputSchema: GenerateSpeakingExerciseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
