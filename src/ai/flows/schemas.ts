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
  pronunciation: z
    .string()
    .describe('The International Phonetic Alphabet (IPA) pronunciation.'),
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

// Schemas for generate-audio.ts
export const GenerateAudioInputSchema = z.string();
export type GenerateAudioInput = z.infer<typeof GenerateAudioInputSchema>;

export const GenerateAudioOutputSchema = z.object({
  audioUrl: z.string().describe('The base64 encoded data URI of the audio.'),
});
export type GenerateAudioOutput = z.infer<typeof GenerateAudioOutputSchema>;

// Schemas for generate-review-flow.ts
export const GenerateReviewInputSchema = z.object({
  words: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      sentence: z.string(),
    })
  ),
});
export type GenerateReviewInput = z.infer<typeof GenerateReviewInputSchema>;

const MatchingQuestionSchema = z.object({
  term: z.string().describe('The word to be defined.'),
  options: z
    .array(z.string())
    .length(4)
    .describe('An array of 4 definitions, one of which is correct.'),
  correctDefinition: z.string().describe('The correct definition.'),
});
export type MatchingQuestion = z.infer<typeof MatchingQuestionSchema>;

const FillInTheBlankQuestionSchema = z.object({
  sentence: z.string().describe('A sentence with a blank (e.g., "___").'),
  correctTerm: z.string().describe('The word that correctly fills the blank.'),
});
export type FillInTheBlankQuestion = z.infer<
  typeof FillInTheBlankQuestionSchema
>;

export const GenerateReviewOutputSchema = z.object({
  matchingQuestions: z
    .array(MatchingQuestionSchema)
    .describe('An array of matching questions.'),
  fillInTheBlankQuestions: z
    .array(FillInTheBlankQuestionSchema)
    .describe('An array of fill-in-the-blank questions.'),
});
export type GenerateReviewOutput = z.infer<typeof GenerateReviewOutputSchema>;

// Schemas for generate-word-details.ts
export const GenerateWordDetailsInputSchema = z.object({
  term: z.string().describe('The word to generate details for.'),
});
export type GenerateWordDetailsInput = z.infer<
  typeof GenerateWordDetailsInputSchema
>;

export const GenerateWordDetailsOutputSchema = z.object({
  pronunciation: z
    .string()
    .describe('The International Phonetic Alphabet (IPA) pronunciation.'),
  definition: z.string().describe('A clear and concise definition of the term.'),
  sentence: z.string().describe('An example sentence using the term in context.'),
});
export type GenerateWordDetailsOutput = z.infer<
  typeof GenerateWordDetailsOutputSchema
>;
