"use server";

/**
 * @fileOverview A flow for generating a comprehensive set of learning content for a lesson.
 * - generateLessonContent - Creates vocabulary, grammar, and a passage/dialogue.
 */

import { createAi, getTextModel } from "@/ai/genkit";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import {
  GenerateLessonContentInputSchema,
  GenerateLessonContentOutputSchema,
  type GenerateLessonContentInput,
  type GenerateLessonContentOutput,
} from "./schemas";

export async function generateLessonContent(
  input: GenerateLessonContentInput,
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

const baseAi = createAi();

const generateLessonContentFlow = baseAi.defineFlow(
  {
    name: "generateLessonContentFlow",
    inputSchema: GenerateLessonContentInputSchema,
    outputSchema: GenerateLessonContentOutputSchema,
  },
  async (input, streamingCallback) => {
    // NOTE: This file is a Server Action/Genkit flow ("use server").
    // Firebase client auth (`auth.currentUser`) is not available here and will be null.
    const apiKey = input.geminiApiKey;

    if (apiKey) {
      console.log("[LingoAI] Using User's Gemini API Key.");
    } else {
      console.log(
        "[LingoAI] User API key not found. Falling back to system default.",
      );
    }

    const systemDefaultKey = process.env.GEMINI_API_KEY;
    if (!apiKey && !systemDefaultKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured and no user Gemini key was provided",
      );
    }

    // Create a per-request AI instance using Gemini API key only (no Vertex fallback).
    const runtimeAi = genkit({
      plugins: [googleAI({ apiKey: (apiKey || systemDefaultKey)! })],
    });
    const textModel = getTextModel();

    // Simple exponential backoff with jitter for 429s and transient errors.
    const withRetry = async <T>(
      fn: () => Promise<T>,
      retries = 3,
      baseMs = 800,
    ): Promise<T> => {
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          return await fn();
        } catch (e: any) {
          const msg = String(e?.message || e);
          const is429 =
            msg.includes("429") || /Too\s*Many\s*Requests/i.test(msg);
          const isRetriable =
            is429 || /ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN/i.test(msg);
          if (attempt >= retries || !isRetriable) throw e;
          const delay =
            Math.min(8000, baseMs * Math.pow(2, attempt)) +
            Math.floor(Math.random() * 200);
          await new Promise((res) => setTimeout(res, delay));
          attempt++;
        }
      }
    };

    try {
      // Prefer a lighter model to reduce rate limit pressure.
      const primary = await withRetry(() =>
        runtimeAi.generate({
          model: textModel,
          prompt: { text: lessonPrompt, input },
          output: { format: "json", schema: GenerateLessonContentOutputSchema },
        } as any),
      );
      if (!primary.output) throw new Error("Primary model returned no output.");
      return primary.output;
    } catch (error) {
      console.warn(
        "Primary model failed. Retrying with fallback model.",
        error,
      );
      const fallback = await withRetry(
        () =>
          runtimeAi.generate({
            model: textModel,
            prompt: { text: lessonPrompt, input },
            output: {
              format: "json",
              schema: GenerateLessonContentOutputSchema,
            },
          } as any),
        2,
        1200,
      );
      if (!fallback.output)
        throw new Error("Fallback model also returned no output.");
      return fallback.output;
    }
  },
);
