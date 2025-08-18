
'use server';

/**
 * @fileOverview A flow for generating a comprehensive set of learning content for a lesson.
 * - generateLessonContent - Creates vocabulary, grammar, and a passage/dialogue.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateLessonContentInputSchema,
  GenerateLessonContentOutputSchema,
  type GenerateLessonContentInput,
  type GenerateLessonContentOutput,
} from './schemas';

export async function generateLessonContent(
  input: GenerateLessonContentInput
): Promise<GenerateLessonContentOutput> {
  return generateLessonContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonContentPrompt',
  input: {schema: GenerateLessonContentInputSchema},
  output: {schema: GenerateLessonContentOutputSchema},
  prompt: `You are an expert English language curriculum designer. Your task is to generate a complete set of learning materials for a single lesson based on the provided topic, skill, and user level.

You must generate three distinct sections:
1.  **Vocabulary Suggestions**: Provide a list of 5-7 essential vocabulary words or phrases highly relevant to the lesson topic. For each item, provide a simple English definition.
2.  **Grammar Focus**: Explain a single, crucial grammar point that is directly applicable to the lesson's skill and topic. The explanation should be clear, concise, and include a good example sentence.
3.  **Passage/Dialogue**:
    *   If the skill is 'Reading' or 'Writing', generate a short reading passage (a few paragraphs) about the topic.
    *   If the skill is 'Listening' or 'Speaking', generate a short, natural-sounding dialogue between two speakers (e.g., Alex, Ben) on the topic.

Lesson Topic: "{{topic}}"
Focus Skill: "{{skill}}"
User Level: "{{level}}"

Generate the complete learning materials.
`,
});

const generateLessonContentFlow = ai.defineFlow(
  {
    name: 'generateLessonContentFlow',
    inputSchema: GenerateLessonContentInputSchema,
    outputSchema: GenerateLessonContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
