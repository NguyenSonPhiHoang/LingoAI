
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
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateLessonContentInputSchema},
  output: {schema: GenerateLessonContentOutputSchema},
  prompt: `You are an expert English language curriculum designer. Your task is to generate a complete set of learning materials for a single lesson based on the provided topic, skill, and user level.

Lesson Topic: "{{topic}}"
Focus Skill: "{{skill}}"
User Level: "{{level}}"

---
**Instructions based on Skill:**

**If the skill is 'Reading', 'Writing', 'Listening', or 'Speaking':**
You must generate three distinct sections:
1.  **Vocabulary Suggestions**: Provide a list of 5-7 essential vocabulary words or phrases highly relevant to the lesson topic. For each item, provide a simple English definition.
2.  **Grammar Focus**: Explain a single, crucial grammar point that is directly applicable to the lesson's skill and topic. The explanation should be clear, concise, and include a good example sentence.
3.  **Passage/Dialogue**:
    *   If 'Reading' or 'Writing', generate a short reading passage (a few paragraphs) about the topic.
    *   If 'Listening' or 'Speaking', generate a short, natural-sounding dialogue between two speakers (e.g., Alex, Ben) on the topic.

**If the skill is 'Pronunciation':**
You must generate three distinct sections for the 'pronunciationFocus' field:
1.  **Word Pronunciation**: Focus on a single, specific sound (e.g., the /æ/ sound). Provide a clear explanation of how to make the sound and give 3-5 example words.
2.  **Sentence Pronunciation**: Focus on connected speech in a sentence (e.g., linking sounds, reductions). Provide a rule or concept and an example sentence demonstrating it.
3.  **Sentence Intonation**: Focus on rising or falling intonation to convey meaning (e.g., for questions vs. statements). Explain the concept and provide an example sentence showing the intonation pattern.

Generate the complete learning materials now.
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
