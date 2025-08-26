
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

const lessonPrompt = `You are an expert English language curriculum designer. Your task is to generate a complete set of learning materials for a single lesson based on the provided topic, skill, and user level.

Lesson Topic: "{{topic}}"
Focus Skill: "{{skill}}"
User Level: "{{level}}"

---
**You must generate three distinct sections:**

1.  **Vocabulary Suggestions**: Provide a list of 5-7 essential vocabulary words or phrases highly relevant to the lesson topic. For each item, provide:
    - The English word or phrase.
    - Its part of speech (e.g., Noun, Verb, Adjective).
    - Its International Phonetic Alphabet (IPA) pronunciation.
    - A simple, clear English definition.
    - A simple, clear Vietnamese definition.

2.  **Key Points**: Identify and list 3-5 key phrases or concepts that are central to understanding the lesson topic.
3.  **Passage/Dialogue**:
    *   If 'Reading' or 'Writing', generate a short reading passage (a few paragraphs) about the topic.
    *   If 'Listening' or 'Speaking', generate a short, natural-sounding dialogue between two speakers (e.g., Alex, Ben) on the topic.
    *   If 'Pronunciation', generate a short passage that includes many examples of the sounds or intonation patterns relevant to the lesson.

Generate the complete learning materials now.
`;

const generateLessonContentFlow = ai.defineFlow(
  {
    name: 'generateLessonContentFlow',
    inputSchema: GenerateLessonContentInputSchema,
    outputSchema: GenerateLessonContentOutputSchema,
  },
  async input => {
    try {
        // Attempt with the primary, more powerful model first.
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: {
                text: lessonPrompt,
                input: input
            },
            output: {
                format: 'json',
                schema: GenerateLessonContentOutputSchema
            },
        });
        if (!output) throw new Error("Primary model returned no output.");
        return output;
    } catch (error) {
        console.warn("Primary model failed. Retrying with fallback model.", error);
        
        // If the primary model fails, try the fallback model.
        const { output: fallbackOutput } = await ai.generate({
            model: 'googleai/gemini-1.5-flash-latest', // Fallback model
            prompt: {
                text: lessonPrompt,
                input: input
            },
            output: {
                format: 'json',
                schema: GenerateLessonContentOutputSchema
            },
        });
        if (!fallbackOutput) throw new Error("Fallback model also returned no output.");
        return fallbackOutput;
    }
  }
);
