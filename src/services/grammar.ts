import { apiGet, apiPost, apiPut } from "@/services/api";

export type GrammarLessonListItem = {
  id: string;
  title: string;
  level: string;
  topic: string | null;
  isPublished: boolean;
  exerciseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GrammarExercise = {
  id: string;
  type: "mcq" | "text";
  prompt: string;
  optionsJson: string | null;
  explanation: string | null;
  points: number;
  sortOrder: number;
};

export type GrammarLessonDetail = {
  id: string;
  title: string;
  level: string;
  topic: string | null;
  contentMarkdown: string;
  exercises: GrammarExercise[];
  resources?: Array<{ title: string; url: string }>;
};

export async function listGrammarLessons() {
  return apiGet<{ lessons: GrammarLessonListItem[] }>("/api/grammar/lessons");
}

export async function getGrammarLesson(lessonId: string) {
  return apiGet<{ lesson: GrammarLessonDetail }>(
    `/api/grammar/lessons/${lessonId}`,
  );
}

export type SubmitGrammarAttemptAnswer = {
  exerciseId: string;
  answer: any;
};

export type SubmitGrammarAttemptResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  results: Array<{
    exerciseId: string;
    isCorrect: boolean;
    score: number;
    points: number;
    explanation: string | null;
  }>;
};

export async function submitGrammarAttempt(
  lessonId: string,
  answers: SubmitGrammarAttemptAnswer[],
) {
  return apiPost<SubmitGrammarAttemptResult>(
    `/api/grammar/lessons/${lessonId}/attempts`,
    { answers },
  );
}

export type CreateGrammarLessonInput = {
  title: string;
  level: "a1" | "a2" | "b1" | "b2" | "c1" | "c2";
  topic?: string | null;
  contentMarkdown: string;
  resources?: Array<{ title: string; url: string }>;
  isPublished?: boolean;
};

export async function createGrammarLesson(input: CreateGrammarLessonInput) {
  return apiPost<{ id: string }>("/api/grammar/lessons", input);
}

export type UpdateGrammarLessonInput = {
  id: string;
  title?: string;
  level?: "a1" | "a2" | "b1" | "b2" | "c1" | "c2";
  topic?: string | null;
  contentMarkdown?: string;
  resources?: Array<{ title: string; url: string }>;
  isPublished?: boolean;
};

export async function updateGrammarLesson(input: UpdateGrammarLessonInput) {
  const { id, ...rest } = input;
  return apiPut<{ ok: true }>(`/api/grammar/lessons/${id}`, rest);
}

export type UpsertGrammarExerciseInput = {
  id?: string;
  type: "mcq" | "text";
  prompt: string;
  optionsJson?: any;
  answerJson: any;
  explanation?: string | null;
  points?: number;
  sortOrder?: number;
};

export async function upsertGrammarExercises(
  lessonId: string,
  exercises: UpsertGrammarExerciseInput[],
) {
  return apiPost<{ ok: true }>(`/api/grammar/lessons/${lessonId}/exercises`, {
    exercises,
  });
}
