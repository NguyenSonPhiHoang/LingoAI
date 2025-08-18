/**
 * @fileOverview Shared schemas for Genkit flows.
 * This file does not have a 'use server' directive,
 * so it can be imported by both server and client components.
 */

import {z} from 'genkit';

// Schemas for extract-vocabulary.ts
export const ExtractVocabularyInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The text content of the document to extract vocabulary from.'),
});
export type ExtractVocabularyInput = z.infer<
  typeof ExtractVocabularyInputSchema
>;

export const VocabularyEntrySchema = z.object({
  term: z.string().describe('The vocabulary word or term.'),
  definition: z.string().describe('A clear and concise definition of the term.'),
  sentence: z.string().describe('An example sentence using the term in context.'),
});
export type VocabularyEntry = z.infer<typeof VocabularyEntrySchema>;

export const ExtractVocabularyOutputSchema = z.object({
  vocabulary: z
    .array(VocabularyEntrySchema)
    .describe('A list of vocabulary entries extracted from the document.'),
});
export type ExtractVocabularyOutput = z.infer<
  typeof ExtractVocabularyOutputSchema
>;
