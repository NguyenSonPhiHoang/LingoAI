"use server";

/**
 * @fileOverview A flow for grouping vocabulary words by topic.
 *
 * - groupVocabularyByTopic - A function that groups vocabulary into topics.
 * - GroupVocabularyInput - The input type for the function.
 * - GroupVocabularyOutput - The return type for the function.
 */

import { ai, getTextModel } from "@/ai/genkit";
import {
  GroupVocabularyInputSchema,
  GroupVocabularyOutputSchema,
  type GroupVocabularyInput,
  type GroupVocabularyOutput,
} from "./schemas";

export async function groupVocabularyByTopic(
  input: GroupVocabularyInput
): Promise<GroupVocabularyOutput> {
  return groupVocabularyByTopicFlow(input);
}

const textModel = getTextModel();

const prompt = ai.definePrompt({
  name: "groupVocabularyPrompt",
  model: textModel,
  input: { schema: GroupVocabularyInputSchema },
  output: { schema: GroupVocabularyOutputSchema },
  prompt: `You are an expert lexicographer and linguist. Your task is to group the following list of vocabulary words, phrases, and sentences into relevant topics.

Create logical topic names based on the context of the words provided. For words that do not fit into a clear category, group them under a topic named "Miscellaneous".

You MUST categorize every word provided.

Vocabulary List to Group:
{{#each vocabulary}}
- Term: {{{this.term}}}
- Definition: {{{this.definition}}}
{{/each}}

Analyze the list and return the words grouped by the topics you have identified.
`,
});

const groupVocabularyByTopicFlow = ai.defineFlow(
  {
    name: "groupVocabularyByTopicFlow",
    inputSchema: GroupVocabularyInputSchema,
    outputSchema: GroupVocabularyOutputSchema,
  },
  async (input) => {
    if (input.vocabulary.length === 0) {
      return {
        topics: [],
      };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
