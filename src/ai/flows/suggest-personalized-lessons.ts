
'use server';

/**
 * @fileOverview A flow for suggesting personalized English lessons based on user level and goals.
 *
 * - suggestPersonalizedLessons - A function that suggests personalized lessons.
 * - SuggestPersonalizedLessonsInput - The input type for the suggestPersonalizedLessons function.
 * - SuggestPersonalizedLessonsOutput - The return type for the suggestPersonalizedLessons function.
 */

import {ai} from '@/ai/genkit';
import {
  SuggestPersonalizedLessonsInputSchema,
  SuggestPersonalizedLessonsOutputSchema,
  type SuggestPersonalizedLessonsInput,
  type SuggestPersonalizedLessonsOutput,
} from './schemas';

export async function suggestPersonalizedLessons(
  input: SuggestPersonalizedLessonsInput
): Promise<SuggestPersonalizedLessonsOutput> {
  return suggestPersonalizedLessonsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPersonalizedLessonsPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: SuggestPersonalizedLessonsInputSchema},
  output: {schema: SuggestPersonalizedLessonsOutputSchema},
  prompt: `You are an AI-powered English language learning assistant. Based on the user's current level, learning goals, and interests, suggest a list of personalized lesson topics.

For each topic, you must categorize it into one of five skills: "Listening", "Speaking", "Reading", "Writing", or "Pronunciation".
The difficulty level for all suggested lessons must be "{{userLevel}}".

User Level: {{{userLevel}}}
Learning Goals: {{{learningGoals}}}
Interests: {{{interests}}}

Suggest a list of lesson topics that will help the user achieve their goals. If the interests field is provided, contextualize the lessons around those interests.
`,
});

const suggestPersonalizedLessonsFlow = ai.defineFlow(
  {
    name: 'suggestPersonalizedLessonsFlow',
    inputSchema: SuggestPersonalizedLessonsInputSchema,
    outputSchema: SuggestPersonalizedLessonsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
