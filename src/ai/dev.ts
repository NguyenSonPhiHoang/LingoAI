import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-personalized-lessons.ts';
import '@/ai/flows/extract-vocabulary.ts';
import '@/ai/flows/generate-audio.ts';
import '@/ai/flows/generate-review-flow.ts';
import '@/ai/flows/schemas.ts';
