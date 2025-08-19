
'use server';

/**
 * @fileOverview A flow for generating pronunciation exercises.
 * - generatePronunciationExercise - A function that creates pronunciation drills.
 */

import {ai} from '@/ai/genkit';
import {
  GeneratePronunciationExerciseInputSchema,
  GeneratePronunciationExerciseOutputSchema,
  type GeneratePronunciationExerciseInput,
  type GeneratePronunciationExerciseOutput,
} from './schemas';

export async function generatePronunciationExercise(
  input: GeneratePronunciationExerciseInput
): Promise<GeneratePronunciationExerciseOutput> {
  return generatePronunciationExerciseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePronunciationExercisePrompt',
  input: {schema: GeneratePronunciationExerciseInputSchema},
  output: {schema: GeneratePronunciationExerciseOutputSchema},
  prompt: `You are an expert English pronunciation coach. Your task is to generate a set of exercises for a user at the "{{userLevel}}" level, focusing on the topic of "{{topic}}".

The exercises should help the user distinguish between and practice specific English sounds.

You must generate two types of exercises:
1.  **Minimal Pairs (3 pairs)**: Create three pairs of words that differ by only one sound (e.g., ship/sheep). These words should be relevant to the topic if possible. For each word, provide its IPA pronunciation.
2.  **Challenging Sentences (2 sentences)**: Create two sentences that are somewhat challenging to pronounce (like simple tongue twisters) and incorporate sounds from the minimal pairs or other sounds relevant to the topic.

{{#if focusPoints}}
The exercises should be designed to help the student practice the following specific sounds or patterns: {{{focusPoints}}}.
{{else}}
The exercises should focus on common pronunciation challenges for English learners related to the topic.
{{/if}}

Topic: {{{topic}}}
Student Level: {{{userLevel}}}
`,
});

const generatePronunciationExerciseFlow = ai.defineFlow(
  {
    name: 'generatePronunciationExerciseFlow',
    inputSchema: GeneratePronunciationExerciseInputSchema,
    outputSchema: GeneratePronunciationExerciseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
