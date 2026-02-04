import { apiGet, apiPost, apiPut, apiDelete } from "./api";

// Types
export interface SpeakingPrompt {
  id: string;
  partNumber: 1 | 2 | 3;
  category: string | null;
  level: string | null;
  title: string;
  promptText: string;
  cueCardBullets: string | null; // JSON array for Part 2
  preparationTime: number | null;
  speakingTime: number | null;
  sampleAnswer: string | null;
  keyVocabulary: string | null; // JSON
  usefulPhrases: string | null; // JSON
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SpeakingTest {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  part1PromptIds: string | null; // JSON array
  part2PromptId: string | null;
  part3PromptIds: string | null; // JSON array
  totalTimeMinutes: number;
  isActive: boolean;
  isPublic: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SpeakingTestWithPrompts extends SpeakingTest {
  part1Prompts: SpeakingPrompt[];
  part2Prompt: SpeakingPrompt | null;
  part3Prompts: SpeakingPrompt[];
}

export interface SpeakingSubmission {
  id: string;
  userId: string;
  testId: string | null;
  promptId: string | null;
  partNumber: 1 | 2 | 3;
  audioUrl: string | null;
  durationSeconds: number | null;
  transcribedText: string | null;
  transcriptionConfidence: number | null;
  aiFeedback: string | null; // JSON
  aiScore: number | null;
  scoreFluency: number | null;
  scoreLexical: number | null;
  scoreGrammar: number | null;
  scorePronunciation: number | null;
  teacherFeedback: string | null;
  teacherScore: number | null;
  gradedByUserId: string | null;
  gradedAt: string | null;
  status: string;
  submittedAt: string;
  updatedAt: string | null;
}

// ==================== PROMPTS ====================

export async function createSpeakingPrompt(input: {
  partNumber: 1 | 2 | 3;
  category?: string | null;
  level?: string | null;
  title: string;
  promptText: string;
  cueCardBullets?: any;
  preparationTime?: number | null;
  speakingTime?: number | null;
  sampleAnswer?: string | null;
  keyVocabulary?: any;
  usefulPhrases?: any;
}): Promise<{ id: string }> {
  const res = await apiPost("/api/vtep-speaking/prompts", input);
  return res.data;
}

export async function listSpeakingPrompts(filters?: {
  partNumber?: 1 | 2 | 3;
  level?: string;
  category?: string;
  search?: string;
}): Promise<SpeakingPrompt[]> {
  const params = new URLSearchParams();
  if (filters?.partNumber) params.set("partNumber", filters.partNumber.toString());
  if (filters?.level) params.set("level", filters.level);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);

  const res = await apiGet(`/api/vtep-speaking/prompts?${params}`);
  return res.data;
}

export async function getSpeakingPrompt(id: string): Promise<SpeakingPrompt> {
  const res = await apiGet(`/api/vtep-speaking/prompts/${id}`);
  return res.data;
}

export async function updateSpeakingPrompt(
  id: string,
  input: Partial<{
    category: string | null;
    level: string | null;
    title: string;
    promptText: string;
    cueCardBullets: any;
    preparationTime: number | null;
    speakingTime: number | null;
    sampleAnswer: string | null;
    keyVocabulary: any;
    usefulPhrases: any;
  }>
): Promise<{ success: boolean }> {
  const res = await apiPut(`/api/vtep-speaking/prompts/${id}`, input);
  return res.data;
}

export async function deleteSpeakingPrompt(id: string): Promise<{ success: boolean }> {
  const res = await apiDelete(`/api/vtep-speaking/prompts/${id}`);
  return res.data;
}

// ==================== TESTS ====================

export async function createSpeakingTest(input: {
  title: string;
  description?: string | null;
  level?: string | null;
  part1PromptIds?: string[];
  part2PromptId?: string | null;
  part3PromptIds?: string[];
  totalTimeMinutes?: number;
  isActive?: boolean;
  isPublic?: boolean;
  documentId?: string | null;
}): Promise<{ id: string }> {
  const res = await apiPost("/api/vtep-speaking/tests", input);
  return res.data;
}

export async function createRandomSpeakingTest(input: {
  level?: string | null;
  title?: string;
  documentId?: string | null;
}): Promise<{ id: string; selectedPrompts: any }> {
  const res = await apiPost("/api/vtep-speaking/tests/random", input);
  return res.data;
}

export async function listSpeakingTests(filters?: {
  level?: string;
  isActive?: boolean;
  isPublic?: boolean;
}): Promise<SpeakingTest[]> {
  const params = new URLSearchParams();
  if (filters?.level) params.set("level", filters.level);
  if (filters?.isActive !== undefined) params.set("isActive", filters.isActive.toString());
  if (filters?.isPublic !== undefined) params.set("isPublic", filters.isPublic.toString());

  const res = await apiGet(`/api/vtep-speaking/tests?${params}`);
  return res.data;
}

export async function getSpeakingTest(id: string): Promise<SpeakingTest> {
  const res = await apiGet(`/api/vtep-speaking/tests/${id}`);
  return res.data;
}

export async function getSpeakingTestWithPrompts(id: string): Promise<SpeakingTestWithPrompts> {
  const res = await apiGet(`/api/vtep-speaking/tests/${id}/with-prompts`);
  return res.data;
}

export async function updateSpeakingTest(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    level: string | null;
    part1PromptIds: string[];
    part2PromptId: string | null;
    part3PromptIds: string[];
    totalTimeMinutes: number;
    isActive: boolean;
    isPublic: boolean;
  }>
): Promise<{ success: boolean }> {
  const res = await apiPut(`/api/vtep-speaking/tests/${id}`, input);
  return res.data;
}

export async function deleteSpeakingTest(id: string): Promise<{ success: boolean }> {
  const res = await apiDelete(`/api/vtep-speaking/tests/${id}`);
  return res.data;
}

// ==================== SUBMISSIONS ====================

export async function createSpeakingSubmission(input: {
  testId?: string | null;
  promptId?: string | null;
  partNumber: 1 | 2 | 3;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  transcribedText?: string | null;
  transcriptionConfidence?: number | null;
}): Promise<{ id: string }> {
  const res = await apiPost("/api/vtep-speaking/submissions", input);
  return res.data;
}

export async function listSpeakingSubmissions(filters?: {
  userId?: string;
  testId?: string;
  status?: string;
}): Promise<SpeakingSubmission[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.testId) params.set("testId", filters.testId);
  if (filters?.status) params.set("status", filters.status);

  const res = await apiGet(`/api/vtep-speaking/submissions?${params}`);
  return res.data;
}

export async function getSpeakingSubmission(id: string): Promise<SpeakingSubmission> {
  const res = await apiGet(`/api/vtep-speaking/submissions/${id}`);
  return res.data;
}

export async function updateSpeakingSubmission(
  id: string,
  input: Partial<{
    audioUrl: string | null;
    durationSeconds: number | null;
    transcribedText: string | null;
    transcriptionConfidence: number | null;
    aiFeedback: any;
    aiScore: number | null;
    scoreFluency: number | null;
    scoreLexical: number | null;
    scoreGrammar: number | null;
    scorePronunciation: number | null;
    teacherFeedback: string | null;
    teacherScore: number | null;
    status: string;
  }>
): Promise<{ success: boolean }> {
  const res = await apiPut(`/api/vtep-speaking/submissions/${id}`, input);
  return res.data;
}

export async function deleteSpeakingSubmission(id: string): Promise<{ success: boolean }> {
  const res = await apiDelete(`/api/vtep-speaking/submissions/${id}`);
  return res.data;
}

export async function gradeSpeakingSubmission(id: string): Promise<any> {
  const res = await apiPost(`/api/vtep-speaking/submissions/${id}/grade`, {});
  return res.data;
}
