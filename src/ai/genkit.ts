import { genkit } from "genkit";
import { vertexAI } from "@genkit-ai/vertexai";

export const ai = genkit({
  plugins: [
    vertexAI({
      projectId:
        process.env.VERTEXAI_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.VERTEXAI_LOCATION || "us-central1",
    }),
  ],
});
