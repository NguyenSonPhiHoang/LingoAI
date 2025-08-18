
'use server';

/**
 * @fileOverview A flow for generating a complete listening exercise.
 * - generateListeningExercise - Creates a dialogue, audio, and questions.
 */

import {ai} from '@/ai/genkit';
import wav from 'wav';
import {
  GenerateListeningExerciseInputSchema,
  GenerateListeningExerciseOutputSchema,
  ReadingComprehensionQuestionSchema,
  type GenerateListeningExerciseInput,
  type GenerateListeningExerciseOutput,
} from './schemas';
import {z} from 'zod';

export async function generateListeningExercise(
  input: GenerateListeningExerciseInput
): Promise<GenerateListeningExerciseOutput> {
  return generateListeningExerciseFlow(input);
}

const DialogueSchema = z.object({
    dialogue: z.array(z.object({
        speaker: z.string().describe('The name of the speaker (e.g., Speaker 1, Alex).'),
        line: z.string().describe('The line spoken by the speaker.'),
    })).describe('The dialogue script.'),
});

const toWav = async (
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });
    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', d => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
    writer.write(pcmData);
    writer.end();
  });
};

const generateListeningExerciseFlow = ai.defineFlow(
  {
    name: 'generateListeningExerciseFlow',
    inputSchema: GenerateListeningExerciseInputSchema,
    outputSchema: GenerateListeningExerciseOutputSchema,
  },
  async ({ topic, focusPoints }) => {
    // 1. Generate Dialogue Script
    const dialoguePrompt = ai.definePrompt({
        name: 'generateDialogueScript',
        input: { schema: GenerateListeningExerciseInputSchema },
        output: { schema: DialogueSchema },
        prompt: `Create a short dialogue between two speakers on the topic of "{{topic}}". The dialogue should be natural and easy to follow for an English learner.
        {{#if focusPoints}}
        Please make sure the dialogue incorporates the following focus points: {{{focusPoints}}}.
        {{/if}}
        `,
    });
    const { output: dialogueOutput } = await dialoguePrompt({ topic, focusPoints });
    if (!dialogueOutput) throw new Error('Failed to generate dialogue script.');

    const dialogueText = dialogueOutput.dialogue.map(d => `${d.speaker}: ${d.line}`).join('\n');

    // 2. Generate Audio from Script
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Speaker 1', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algenib' }}},
                        { speaker: 'Speaker 2', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' }}},
                    ]
                }
            },
        },
        prompt: {text: dialogueText},
    });
    if (!media) throw new Error('Audio generation failed.');

    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    const audioUrl = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

    // 3. Generate Comprehension Questions
    const questionsPrompt = ai.definePrompt({
        name: 'generateListeningQuestions',
        input: { schema: z.object({ dialogueText: z.string() }) },
        output: { schema: z.object({ questions: z.array(ReadingComprehensionQuestionSchema) }) },
        prompt: `Based on the following dialogue, create 3 multiple-choice comprehension questions. Each question must have 4 options, with one clear correct answer.

Dialogue:
{{{dialogueText}}}
`,
    });
    const { output: questionsOutput } = await questionsPrompt({ dialogueText });
    if (!questionsOutput) throw new Error('Failed to generate comprehension questions.');

    return {
        dialogue: dialogueOutput.dialogue,
        audioUrl,
        questions: questionsOutput.questions,
    };
  }
);
