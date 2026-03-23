import { apiGet } from "./api";

export interface AdminOverview {
  userStats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    students: number;
    teachers: number;
    admins: number;
    activeLastWeek: number;
  };
  registrationsByDay: { date: string; count: number }[];
  testStats: {
    totalAttempts: number;
    avgScore: number | null;
    avgDurationMin: number | null;
  };
  testsBySkill: {
    skill: string;
    attempts: number;
    avgScore: number | null;
    accuracy: number | null;
  }[];
  sessionStats: {
    totalSessions: number;
    avgDurationMin: number | null;
    completionRate: number | null;
  };
  topActiveUsers: {
    userId: string;
    displayName: string;
    email: string;
    attempts: number;
    avgScore: number | null;
    lastActive: string | null;
  }[];
}

export const getAdminOverview = () =>
  apiGet<AdminOverview>("/api/insights/admin/overview");
