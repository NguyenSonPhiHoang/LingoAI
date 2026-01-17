"use server";

/**
 * @fileOverview A flow for generating audio from text.
 * - generateAudio - A function that converts text to speech.
 * - GenerateAudioInput - The input type for the generateAudio function.
 * - GenerateAudioOutput - The return type for the generateAudio function.
 */

import { createAi, getTtsModel } from "@/ai/genkit";
import wav from "wav";
import {
  GenerateAudioInputSchema,
  GenerateAudioOutputSchema,
  type GenerateAudioInput,
  type GenerateAudioOutput,
} from "./schemas";

export async function generateAudio(
  input: GenerateAudioInput
): Promise<GenerateAudioOutput> {
  return generateAudioFlow(input);
}

function pickMediaUrl(result: any): string | undefined {
  const direct = result?.media?.url;
  if (typeof direct === "string" && direct.length) return direct;

  const arr = result?.media;
  if (Array.isArray(arr)) {
    const firstUrl = arr?.[0]?.url;
    if (typeof firstUrl === "string" && firstUrl.length) return firstUrl;
  }

  const content =
    result?.message?.content ??
    result?.candidates?.[0]?.message?.content ??
    result?.candidates?.[0]?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const url = part?.media?.url;
      if (typeof url === "string" && url.length) return url;
    }
  }

  return undefined;
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on("error", reject);
    writer.on("data", (d: Buffer) => {
      bufs.push(d);
    });
    writer.on("end", () => {
      resolve(Buffer.concat(bufs).toString("base64"));
    });

    writer.write(pcmData);
    writer.end();
  });
}

function parseDataUriMime(dataUri: string): {
  mime: string;
  params: Record<string, string>;
  base64: string;
} | null {
  if (!dataUri.startsWith("data:")) return null;
  const comma = dataUri.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUri.slice(5, comma); // after 'data:'
  const base64 = dataUri.slice(comma + 1);
  const parts = meta.split(";");
  const mime = (parts[0] || "").trim().toLowerCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const kv = p.split("=");
    if (kv.length === 2) params[kv[0].trim().toLowerCase()] = kv[1].trim();
  }
  return { mime, params, base64 };
}

function isBrowserPlayableAudioMime(mime: string): boolean {
  // Conservative allowlist.
  return (
    mime === "audio/wav" ||
    mime === "audio/x-wav" ||
    mime === "audio/wave" ||
    mime === "audio/mpeg" ||
    mime === "audio/mp3" ||
    mime === "audio/ogg" ||
    mime === "audio/webm"
  );
}

const baseAi = createAi();

const generateAudioFlow = baseAi.defineFlow(
  {
    name: "generateAudioFlow",
    inputSchema: GenerateAudioInputSchema,
    outputSchema: GenerateAudioOutputSchema,
  },
  async ({ text, geminiApiKey }) => {
    const ai = createAi(geminiApiKey);
    const ttsModel = getTtsModel();
    try {
      const result = await ai.generate({
        model: ttsModel,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Algenib" },
            },
          },
        },
        prompt: { text },
      });

      const mediaUrl = pickMediaUrl(result);
      if (!mediaUrl) {
        throw new Error(
          `Audio generation failed. No media was returned. Model: ${ttsModel}. Response text: ${String(
            result?.text ?? ""
          )}`
        );
      }

      if (mediaUrl.startsWith("data:audio/")) {
        const parsed = parseDataUriMime(mediaUrl);
        if (parsed) {
          if (isBrowserPlayableAudioMime(parsed.mime)) {
            return { audioUrl: mediaUrl };
          }

          // Common TTS returns: audio/pcm or audio/L16 (optionally with rate=24000).
          if (parsed.mime === "audio/pcm" || parsed.mime === "audio/l16") {
            const rate = Number(parsed.params.rate || 24000);
            const pcm = Buffer.from(parsed.base64, "base64");
            return {
              audioUrl:
                "data:audio/wav;base64," +
                (await toWav(pcm, 1, isFinite(rate) ? rate : 24000, 2)),
            };
          }
        }

        // Unknown audio mime: return it and let the client decide/fallback.
        return { audioUrl: mediaUrl };
      }

      const audioBuffer = Buffer.from(
        mediaUrl.substring(mediaUrl.indexOf(",") + 1),
        "base64"
      );
      return {
        audioUrl: "data:audio/wav;base64," + (await toWav(audioBuffer)),
      };
    } catch (error) {
      console.warn(
        `AI audio generation failed for text "${text}". Will use browser TTS fallback. Error:`,
        error
      );
      // Return an empty URL to signal fallback to the client
      return { audioUrl: "" };
    }
  }
);
