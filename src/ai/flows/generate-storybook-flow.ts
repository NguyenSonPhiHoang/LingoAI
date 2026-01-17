"use server";

/**
 * @fileOverview A flow for generating a storybook for learning English.
 * - generateStorybook - Creates a story based on a topic or vocabulary list.
 */

import { ai, getTextModel } from "@/ai/genkit";
import {
  GenerateStorybookInputSchema,
  GenerateStorybookOutputSchema,
  type GenerateStorybookInput,
  type GenerateStorybookOutput,
} from "./schemas";

export async function generateStorybook(
  input: GenerateStorybookInput
): Promise<GenerateStorybookOutput> {
  return generateStorybookFlow(input);
}

const textModel = getTextModel();

const prompt = ai.definePrompt({
  name: "generateStorybookPrompt",
  model: textModel,
  input: { schema: GenerateStorybookInputSchema },
  output: { schema: GenerateStorybookOutputSchema },
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

- If the format is 'bilingual', you must provide the full story in English in the 'englishStory' field, and then a full Vietnamese translation in the 'vietnameseStory' field.
- If the format is 'interspersed' (truyện chêm), you must write the story primarily in Vietnamese, but strategically insert key English words or phrases (from the vocabulary list if provided, or relevant to the topic). This version goes into the 'interspersedStory' field. Additionally, you must generate a complete, normal English version of the story and put it in the 'fullEnglishStory' field.

The output must contain:
1.  A short, catchy title for the story in English.
2.  A list of 5-10 key vocabulary words from the story. For each word, provide: its simple English definition, its part of speech, its IPA pronunciation, and its direct Vietnamese translation in the 'vietnameseWord' field.
3.  The story content, formatted as requested in the correct fields.

Generate the storybook now.
`,
});

const generateStorybookFlow = ai.defineFlow(
  {
    name: "generateStorybookFlow",
    inputSchema: GenerateStorybookInputSchema,
    outputSchema: GenerateStorybookOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
