import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-personalized-lessons.ts';
import '@/ai/flows/extract-vocabulary.ts';
import '@/ai/flows/generate-audio.ts';
import '@/ai/flows/generate-review-flow.ts';
import '@/ai/flows/generate-word-details.ts';
import '@/ai/flows/group-vocabulary.ts';
import '@/ai/flows/generate-reading-exercise-flow.ts';
import '@/ai/flows/generate-writing-exercise-flow.ts';
import '@/ai/flows/generate-listening-exercise-flow.ts';
import '@/ai/flows/generate-speaking-exercise-flow.ts';
import '@/ai/flows/translate-text-flow.ts';
import '@/ai/flows/generate-feedback-flow.ts';
import '@/ai/flows/generate-writing-feedback-flow.ts';
import '@/ai/flows/schemas.ts';
