import { apiGet } from "@/services/api";

export type InsightsSummary = {
  attempts: number;
  practiceAttempts: number;
  placementAttempts: number;
  reviewAttempts: number;
  avgScore: number | null;
  lastCompletedAt: string | null;
};

export type InsightsBySkill = {
  skill: string;
  attempts: number;
  avgScore: number | null;
  accuracy: number | null;
};

export type InsightsWeakKind = {
  kind: string;
  attempts: number;
  accuracy: number | null;
};

export type MyInsights = {
  windowDays: number;
  summary: InsightsSummary;
  bySkill: InsightsBySkill[];
  weakKinds: InsightsWeakKind[];
};

export async function getMyInsights(
  days = 30,
  token?: string | null
): Promise<MyInsights> {
  const safeDays = Math.max(1, Math.min(365, Number(days) || 30));
  return apiGet<MyInsights>(`/api/insights/me?days=${safeDays}`, token);
}
