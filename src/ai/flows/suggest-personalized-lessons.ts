'use server';

/**
 * @fileOverview A flow for suggesting personalized English lessons based on user level and goals.
 *
 * - suggestPersonalizedLessons - A function that suggests personalized lessons.
 * - SuggestPersonalizedLessonsInput - The input type for the suggestPersonalizedLessons function.
 * - SuggestPersonalizedLessonsOutput - The return type for the suggestPersonalizedLessons function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPersonalizedLessonsInputSchema = z.object({
  userLevel: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .describe('The user\'s current English proficiency level.'),
  learningGoals: z
    .string()
    .describe(
      'Specific learning goals, e.g., "improve conversational skills", "pass TOEFL", "business English".'
    ),
  interests: z
    .string()
    .optional()
    .describe(
      'The user\'s interests, which could be used to contextualize the lesson recommendations.'
    ),
});
export type SuggestPersonalizedLessonsInput = z.infer<
  typeof SuggestPersonalizedLessonsInputSchema
>;

const SuggestPersonalizedLessonsOutputSchema = z.object({
  lessonSuggestions: z
    .array(z.string())
    .describe(
      'A list of personalized lesson suggestions based on the user\'s level and goals.'
    ),
});
export type SuggestPersonalizedLessonsOutput = z.infer<
  typeof SuggestPersonalizedLessonsOutputSchema
>;

export async function suggestPersonalizedLessons(
  input: SuggestPersonalizedLessonsInput
): Promise<SuggestPersonalizedLessonsOutput> {
  return suggestPersonalizedLessonsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPersonalizedLessonsPrompt',
  input: {schema: SuggestPersonalizedLessonsInputSchema},
  output: {schema: SuggestPersonalizedLessonsOutputSchema},
  prompt: `You are an AI-powered English language learning assistant. Based on the user's current level, learning goals, and interests, suggest a list of personalized lesson topics.

User Level: {{{userLevel}}}
Learning Goals: {{{learningGoals}}}
Interests: {{{interests}}}

Suggest a list of lesson topics that will help the user achieve their goals. Provide just a list of topics without extra explanation. If the interests field is provided, contextualize the lessons around those interests.
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
