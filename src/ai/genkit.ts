import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Allow the API key to be provided dynamically on a per-request basis.
      // Genkit will automatically use process.env.GEMINI_API_KEY as a fallback.
      apiKey: async () => undefined,
    }),
  ],
});
