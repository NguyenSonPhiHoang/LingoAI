

/**
 * @fileOverview Shared schemas for Genkit flows.
 * This file does not have a 'use server' directive,
 * so it can be imported by both server and client components.
 */

import {z} from 'zod';

// Schemas for extract-vocabulary.ts
export const ExtractVocabularyInputSchema = z.object({
  documentContent: z
    .string()
    .optional()
    .describe('The text content of the document to extract vocabulary from.'),
  imageDataUri: z
    .string()
    .optional()
    .describe("An image of vocabulary, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
}).refine(data => data.documentContent || data.imageDataUri, {
    message: 'Either documentContent or imageDataUri must be provided.',
});

export type ExtractVocabularyInput = z.infer<
  typeof ExtractVocabularyInputSchema
>;

export const VocabularyEntrySchema = z.object({
  term: z.string().describe('The vocabulary word, phrase, or sentence.'),
  pronunciation: z
    .string()
    .describe('The International Phonetic Alphabet (IPA) pronunciation.'),
  partOfSpeech: z
    .string()
    .describe('The part of speech (e.g., Noun, Verb, Adjective, Phrase).'),
  definition: z.string().describe('A clear and concise definition of the term.'),
  vietnameseDefinition: z
    .string()
    .describe('A clear and concise Vietnamese definition of the term.'),
  sentence: z.string().describe('An example sentence using the term in context.'),
  vietnameseSentence: z
    .string()
    .describe('The Vietnamese translation of the example sentence.'),
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
export const GenerateAudioInputSchema = z.object({
  text: z.string().describe('The text to convert to audio.'),
});
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
  options: z
    .array(z.string())
    .length(4)
    .describe('An array of 4 terms, one of which is correct.'),
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
  term: z.string().describe('The word, phrase, or sentence to generate details for.'),
});
export type GenerateWordDetailsInput = z.infer<
  typeof GenerateWordDetailsInputSchema
>;

export const GenerateWordDetailsOutputSchema = z.object({
  pronunciation: z
    .string()
    .describe('The International Phonetic Alphabet (IPA) pronunciation.'),
  partOfSpeech: z
    .string()
    .describe('The part of speech (e.g., Noun, Verb, Adjective, Phrase).'),
  definition: z.string().describe('A clear and concise definition of the term.'),
  vietnameseDefinition: z
    .string()
    .describe('A clear and concise Vietnamese definition of the term.'),
  sentence: z.string().describe('An example sentence using the term in context.'),
  vietnameseSentence: z
    .string()
    .describe('The Vietnamese translation of the example sentence.'),
});
export type GenerateWordDetailsOutput = z.infer<
  typeof GenerateWordDetailsOutputSchema
>;


// Schemas for group-vocabulary.ts
// The input for grouping now only needs the minimal schema, not the full user-specific data.
export const GroupVocabularyInputSchema = z.object({
  vocabulary: z.array(VocabularyEntrySchema),
});
export type GroupVocabularyInput = z.infer<typeof GroupVocabularyInputSchema>;

export const VocabularyTopicSchema = z.object({
  topic: z.string().describe('The name of the vocabulary topic.'),
  words: z.array(VocabularyEntrySchema).describe('A list of vocabulary entries belonging to this topic.'),
});
export type VocabularyTopic = z.infer<typeof VocabularyTopicSchema>;


export const GroupVocabularyOutputSchema = z.object({
  topics: z.array(VocabularyTopicSchema).describe('A list of topics, each containing a list of related vocabulary words.'),
});
export type GroupVocabularyOutput = z.infer<typeof GroupVocabularyOutputSchema>;

// Schemas for suggest-personalized-lessons.ts
export const UserLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type UserLevel = z.infer<typeof UserLevelSchema>;

export const SuggestPersonalizedLessonsInputSchema = z.object({
  userLevel: UserLevelSchema.describe('The user\'s current English proficiency level.'),
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

const LessonSuggestionSchema = z.object({
    topic: z.string().describe('A concise and engaging topic for the lesson.'),
    skill: z.enum(['Listening', 'Speaking', 'Reading', 'Writing', 'Pronunciation']).describe('The core skill this lesson focuses on.'),
    level: UserLevelSchema.describe('The difficulty level of the lesson.'),
});
export type LessonSuggestion = z.infer<typeof LessonSuggestionSchema>;

export const SuggestPersonalizedLessonsOutputSchema = z.object({
  lessonSuggestions: z
    .array(LessonSuggestionSchema)
    .describe(
      'A list of personalized lesson suggestions, each with a topic and a skill category.'
    ),
});
export type SuggestPersonalizedLessonsOutput = z.infer<
  typeof SuggestPersonalizedLessonsOutputSchema
>;


// Schemas for generate-reading-exercise-flow.ts
export const GenerateReadingExerciseInputSchema = z.object({
    passage: z.string().describe('The reading passage to base the exercise on.'),
    focusPoints: z.string().optional().describe('Specific grammar, vocabulary, or tense to focus on in the questions.'),
});
export type GenerateReadingExerciseInput = z.infer<typeof GenerateReadingExerciseInputSchema>;

export const ReadingComprehensionQuestionSchema = z.object({
    question: z.string().describe('The comprehension question.'),
    options: z.array(z.string()).length(4).describe('Four possible answers.'),
    correctOption: z.string().describe('The correct answer from the options.'),
});
export type ReadingComprehensionQuestion = z.infer<typeof ReadingComprehensionQuestionSchema>;

export const GenerateReadingExerciseOutputSchema = z.object({
    questions: z.array(ReadingComprehensionQuestionSchema).describe('A list of comprehension questions.'),
});
export type GenerateReadingExerciseOutput = z.infer<typeof GenerateReadingExerciseOutputSchema>;


// Schemas for generate-writing-exercise-flow.ts
export const GenerateWritingExerciseInputSchema = z.object({
    topic: z.string().describe('The lesson topic.'),
    userLevel: UserLevelSchema.describe('The user\'s proficiency level.'),
    focusPoints: z.string().optional().describe('Specific grammar, vocabulary, or tense the user should practice.'),
});
export type GenerateWritingExerciseInput = z.infer<typeof GenerateWritingExerciseInputSchema>;

export const WritingPromptSchema = z.object({
    vietnamesePrompt: z.string().describe('The sentence prompt in Vietnamese.'),
    englishHint: z.string().describe("A hint, which MUST be a grammar structure or syntax advice (e.g., \"Use the past continuous tense\", \"Try using a relative clause with 'which'\")."),
    exampleAnswer: z.string().describe('An example of a good answer in English.'),
});
export type WritingPrompt = z.infer<typeof WritingPromptSchema>;

export const GenerateWritingExerciseOutputSchema = z.object({
    prompts: z.array(WritingPromptSchema).describe('A list of writing prompts.'),
});
export type GenerateWritingExerciseOutput = z.infer<typeof GenerateWritingExerciseOutputSchema>;


// Schemas for generate-listening-exercise-flow.ts
export const GenerateListeningExerciseInputSchema = z.object({
    topic: z.string().describe('The lesson topic.'),
    focusPoints: z.string().optional().describe('Specific grammar, vocabulary, or tense to include in the dialogue.'),
});
export type GenerateListeningExerciseInput = z.infer<typeof GenerateListeningExerciseInputSchema>;

export const GenerateListeningExerciseOutputSchema = z.object({
    dialogue: z.array(z.object({
        speaker: z.string().describe('The name of the speaker (e.g., Speaker 1, Alex).'),
        line: z.string().describe('The line spoken by the speaker.'),
    })).describe('The dialogue script.'),
    audioUrl: z.string().describe('The base64 encoded data URI of the dialogue audio.'),
    questions: z.array(ReadingComprehensionQuestionSchema).describe('A list of comprehension questions based on the dialogue.'),
});
export type GenerateListeningExerciseOutput = z.infer<typeof GenerateListeningExerciseOutputSchema>;


// Schemas for generate-speaking-exercise-flow.ts
export const GenerateSpeakingExerciseInputSchema = z.object({
    topic: z.string().describe('The lesson topic.'),
    focusPoints: z.string().optional().describe('Specific grammar, vocabulary, or tense to include in the role-play.'),
});
export type GenerateSpeakingExerciseInput = z.infer<typeof GenerateSpeakingExerciseInputSchema>;

export const SpeakingRolePlayLineSchema = z.object({
    role: z.string().describe('The role to be played (e.g., "You", "Interviewer").'),
    line: z.string().describe('The line or instruction for that role.'),
});
export type SpeakingRolePlayLine = z.infer<typeof SpeakingRolePlayLineSchema>;

export const GenerateSpeakingExerciseOutputSchema = z.object({
    scenario: z.string().describe('A brief description of the role-play scenario.'),
    dialogue: z.array(SpeakingRolePlayLineSchema).describe('The role-play dialogue script.'),
});
export type GenerateSpeakingExerciseOutput = z.infer<typeof GenerateSpeakingExerciseOutputSchema>;

// Schemas for translate-text-flow.ts
export const TranslateTextInputSchema = z.object({
  text: z.string().describe('The text to be translated.'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

export const TranslateTextOutputSchema = z.object({
  translation: z.string().describe('The Vietnamese translation of the text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;


// Schemas for generate-feedback-flow.ts
export const GenerateFeedbackInputSchema = z.object({
  passage: z.string().describe('The original reading passage.'),
  question: z.string().describe('The question the user was asked.'),
  userAnswer: z.string().describe('The user\'s incorrect answer.'),
  correctAnswer: z.string().describe('The correct answer.'),
});
export type GenerateFeedbackInput = z.infer<typeof GenerateFeedbackInputSchema>;

export const GenerateFeedbackOutputSchema = z.object({
  explanation: z
    .string()
    .describe(
      'A detailed explanation of why the user\'s answer is incorrect and the correct answer is right.'
    ),
});
export type GenerateFeedbackOutput = z.infer<
  typeof GenerateFeedbackOutputSchema
>;


// Schemas for generate-writing-feedback-flow.ts
export const GenerateWritingFeedbackInputSchema = z.object({
  vietnamesePrompt: z.string().describe('The original prompt in Vietnamese.'),
  englishHint: z.string().describe('The English hint that was provided.'),
  userWrittenText: z.string().describe("The user's written response in English."),
});
export type GenerateWritingFeedbackInput = z.infer<typeof GenerateWritingFeedbackInputSchema>;

export const GenerateWritingFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Constructive feedback on the user\'s writing, explaining grammar, style, and vocabulary issues.'),
  correctedText: z.string().describe('A corrected version of the user\'s text.'),
});
export type GenerateWritingFeedbackOutput = z.infer<typeof GenerateWritingFeedbackOutputSchema>;


// Schemas for generate-lesson-content.ts
export const GenerateLessonContentInputSchema = z.object({
    topic: z.string().describe("The lesson's main topic."),
    skill: z.enum(['Listening', 'Speaking', 'Reading', 'Writing', 'Pronunciation']).describe("The skill focus of the lesson."),
    level: UserLevelSchema.describe("The user's proficiency level."),
});
export type GenerateLessonContentInput = z.infer<typeof GenerateLessonContentInputSchema>;

const VocabularySuggestionSchema = z.object({
    word: z.string().describe("The vocabulary word or phrase."),
    definition: z.string().describe("A simple English definition."),
});

const GrammarFocusSchema = z.object({
    title: z.string().describe("The name of the grammar or pronunciation point (e.g., 'Past Perfect Tense', 'The /?/ vs /??/ sound')."),
    explanation: z.string().describe("A concise explanation of the rule."),
    example: z.string().describe("An example sentence or list of words demonstrating the rule."),
});

const PassageSchema = z.object({
    title: z.string().describe("A title for the passage, dialogue, or word list."),
    body: z.string().describe("The full text of the reading passage, dialogue script, or example words list."),
});

export const GenerateLessonContentOutputSchema = z.object({
    vocabularySuggestions: z.array(VocabularySuggestionSchema).describe("A list of suggested vocabulary relevant to the topic."),
    grammarFocus: GrammarFocusSchema.describe("An explanation of a relevant grammar or pronunciation point."),
    passage: PassageSchema.describe("A reading passage, dialogue script, or word list related to the topic."),
});
export type GenerateLessonContentOutput = z.infer<typeof GenerateLessonContentOutputSchema>;


// Schemas for generate-pronunciation-exercise.ts
export const GeneratePronunciationExerciseInputSchema = z.object({
    topic: z.string().describe('The lesson topic.'),
    userLevel: UserLevelSchema.describe('The user\'s proficiency level.'),
    focusPoints: z.string().optional().describe('Specific sounds or phonetic patterns the user should practice.'),
});
export type GeneratePronunciationExerciseInput = z.infer<typeof GeneratePronunciationExerciseInputSchema>;

const MinimalPairSchema = z.object({
    word1: z.string().describe('The first word in the pair.'),
    pronunciation1: z.string().describe('The IPA pronunciation for the first word.'),
    word2: z.string().describe('The second word in the pair.'),
    pronunciation2: z.string().describe('The IPA pronunciation for the second word.'),
});

export const GeneratePronunciationExerciseOutputSchema = z.object({
    minimalPairs: z.array(MinimalPairSchema).length(3).describe('A list of three minimal pairs.'),
    challengingSentences: z.array(z.string()).length(2).describe('A list of two challenging sentences for pronunciation practice.'),
});
export type GeneratePronunciationExerciseOutput = z.infer<typeof GeneratePronunciationExerciseOutputSchema>;

// Schemas for generate-storybook-flow.ts
export const StorybookFormatSchema = z.enum(['bilingual', 'interspersed']);
export type StorybookFormat = z.infer<typeof StorybookFormatSchema>;

export const GenerateStorybookInputSchema = z.object({
    level: UserLevelSchema,
    format: StorybookFormatSchema,
    topic: z.string().optional(),
    vocabulary: z.array(z.object({
        term: z.string(),
        definition: z.string(),
    })).optional(),
});
export type GenerateStorybookInput = z.infer<typeof GenerateStorybookInputSchema>;

const StorybookVocabularySchema = z.object({
    word: z.string(),
    definition: z.string(),
    partOfSpeech: z.string(),
    pronunciation: z.string(),
});

export const GenerateStorybookOutputSchema = z.object({
    title: z.string(),
    keyVocabulary: z.array(StorybookVocabularySchema),
    storyContent: z.string(),
});
export type GenerateStorybookOutput = z.infer<typeof GenerateStorybookOutputSchema>;


// Schemas for generate-placement-test.ts
export const PlacementTestQuestionSchema = z.object({
    question: z.string().describe('The test question.'),
    options: z.array(z.string()).length(4).describe('Four possible answers.'),
    correctOption: z.string().describe('The correct answer from the options.'),
    level: UserLevelSchema.describe('The difficulty level of the question.'),
});
export type PlacementTestQuestion = z.infer<typeof PlacementTestQuestionSchema>;

export const GeneratePlacementTestOutputSchema = z.object({
    questions: z.array(PlacementTestQuestionSchema).describe('A list of placement test questions.'),
});
export type GeneratePlacementTestOutput = z.infer<typeof GeneratePlacementTestOutputSchema>;
