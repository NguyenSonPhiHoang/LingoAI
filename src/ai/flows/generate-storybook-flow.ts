
'use server';

/**
 * @fileOverview A flow for generating a storybook for learning English.
 * - generateStorybook - Creates a story based on a topic or vocabulary list.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateStorybookInputSchema,
  GenerateStorybookOutputSchema,
  type GenerateStorybookInput,
  type GenerateStorybookOutput,
} from './schemas';

export async function generateStorybook(
  input: GenerateStorybookInput
): Promise<GenerateStorybookOutput> {
  return generateStorybookFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStorybookPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: GenerateStorybookInputSchema},
  output: {schema: GenerateStorybookOutputSchema},
  prompt: `You are an expert English language teacher and a creative storyteller. Your task is to generate a short story for an English learner at the "{{level}}" level. The story should be engaging and educational.

The story must be generated based on one of the following inputs:
{{#if topic}}
- A specific topic: "{{topic}}"
{{/if}}
{{#if vocabulary}}
- A list of vocabulary words to incorporate:
  {{#each vocabulary}}
  - {{{this.term}}}: {{{this.definition}}}
  {{/each}}
{{/if}}

You must format the story according to the specified format: "{{format}}".

- If the format is 'bilingual', you must provide the full story in English, and then a full Vietnamese translation. The 'storyContent' field should contain both versions.
- If the format is 'interspersed' (truyện chêm), you must write the story primarily in Vietnamese, but strategically insert key English words or phrases (from the vocabulary list if provided, or relevant to the topic). These English words should be naturally woven into the Vietnamese sentences. This version goes into the 'storyContent' field. Additionally, you must generate a complete, normal English version of the story and put it in the 'fullEnglishStory' field.

The output must contain:
1.  A short, catchy title for the story in English.
2.  A list of 5-10 key vocabulary words from the story. For each word, provide its simple English definition, part of speech, and IPA pronunciation.
3.  The full story content, formatted as requested.
4.  If the format is 'interspersed', the full English version of the story.

Generate the storybook now.
`,
});

const generateStorybookFlow = ai.defineFlow(
  {
    name: 'generateStorybookFlow',
    inputSchema: GenerateStorybookInputSchema,
    outputSchema: GenerateStorybookOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

