"use server";

/**
 * @fileOverview A flow for generating a complete listening exercise.
 * - generateListeningExercise - Creates a dialogue, audio, and questions.
 */

import { ai, getTextModel, getTtsModel } from "@/ai/genkit";
import wav from "wav";
import {
  GenerateListeningExerciseInputSchema,
  GenerateListeningExerciseOutputSchema,
  ReadingComprehensionQuestionSchema,
  type GenerateListeningExerciseInput,
  type GenerateListeningExerciseOutput,
} from "./schemas";
import { z } from "zod";

export async function generateListeningExercise(
  input: GenerateListeningExerciseInput,
): Promise<GenerateListeningExerciseOutput> {
  return generateListeningExerciseFlow(input);
}

const DialogueSchema = z.object({
  dialogue: z
    .array(
      z.object({
        speaker: z
          .string()
          .describe("The name of the speaker (e.g., Speaker 1, Alex)."),
        line: z.string().describe("The line spoken by the speaker."),
      }),
    )
    .describe("The dialogue script."),
});

const toWav = async (
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });
    const bufs: Buffer[] = [];
    writer.on("error", reject);
    writer.on("data", (d) => bufs.push(d));
    writer.on("end", () => resolve(Buffer.concat(bufs).toString("base64")));
    writer.write(pcmData);
    writer.end();
  });
};

const generateDialogueScript = async (
  input: GenerateListeningExerciseInput,
) => {
  const model = getTextModel();
  const promptText = `Create a short dialogue between two speakers on the topic of "{{topic}}". The dialogue should be natural and easy to follow for an English learner.
    {{#if focusPoints}}
    Please make sure the dialogue incorporates the following focus points: {{{focusPoints}}}.
    {{/if}}
    `;

  try {
    const { output } = await ai.generate({
      model,
      prompt: { text: promptText, input },
      output: { schema: DialogueSchema, format: "json" },
    } as any);
    if (!output)
      throw new Error("Primary model failed to generate dialogue script.");
    return output;
  } catch (error) {
    console.warn(
      "Primary model failed for dialogue script. Retrying with fallback.",
      error,
    );
    const { output: fallbackOutput } = await ai.generate({
      model,
      prompt: { text: promptText, input },
      output: { schema: DialogueSchema, format: "json" },
    } as any);
    if (!fallbackOutput)
      throw new Error(
        "Fallback model also failed to generate dialogue script.",
      );
    return fallbackOutput;
  }
};

const generateComprehensionQuestions = async (dialogueText: string) => {
  const model = getTextModel();
  const promptText = `Based on the following dialogue, create 3 multiple-choice comprehension questions. Each question must have 4 options, with one clear correct answer.

Dialogue:
{{{dialogueText}}}
`;
  const input = { dialogueText };
  const outputSchema = z.object({
    questions: z.array(ReadingComprehensionQuestionSchema),
  });

  try {
    const { output } = await ai.generate({
      model,
      prompt: { text: promptText, input },
      output: { schema: outputSchema, format: "json" },
    } as any);
    if (!output) throw new Error("Primary model failed to generate questions.");
    return output;
  } catch (error) {
    console.warn(
      "Primary model failed for listening questions. Retrying with fallback.",
      error,
    );
    const { output: fallbackOutput } = await ai.generate({
      model,
      prompt: { text: promptText, input },
      output: { schema: outputSchema, format: "json" },
    } as any);
    if (!fallbackOutput)
      throw new Error("Fallback model also failed to generate questions.");
    return fallbackOutput;
  }
};

const generateListeningExerciseFlow = ai.defineFlow(
  {
    name: "generateListeningExerciseFlow",
    inputSchema: GenerateListeningExerciseInputSchema,
    outputSchema: GenerateListeningExerciseOutputSchema,
  },
  async ({ topic, focusPoints }) => {
    // 1. Generate Dialogue Script
    const dialogueOutput = await generateDialogueScript({ topic, focusPoints });
    if (!dialogueOutput) throw new Error("Failed to generate dialogue script.");

    const dialogueText = dialogueOutput.dialogue
      .map((d: any) => `${d.speaker}: ${d.line}`)
      .join("\n");

    // 2. Generate Audio from Script
    const { media } = await ai.generate({
      model: getTtsModel(),
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: "Speaker 1",
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Algenib" } },
              },
              {
                speaker: "Speaker 2",
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Achernar" } },
              },
            ],
          },
        },
      },
      prompt: { text: dialogueText },
    } as any);
    if (!media) throw new Error("Audio generation failed.");

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(",") + 1),
      "base64",
    );
    const audioUrl = "data:audio/wav;base64," + (await toWav(audioBuffer));

    // 3. Generate Comprehension Questions
    const questionsOutput = await generateComprehensionQuestions(dialogueText);
    if (!questionsOutput)
      throw new Error("Failed to generate comprehension questions.");

    return {
      dialogue: dialogueOutput.dialogue,
      audioUrl,
      questions: questionsOutput.questions,
    };
  },
);
