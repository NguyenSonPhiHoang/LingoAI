import { apiGet } from "./api";

export interface SessionDto {
  sessionId?: number;
  userId: string;
  lessonId?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  learningMode?: string | null;
  accuracyRate?: number | null;
  completed?: boolean;
  ipAddress?: string | null;
}

export const getMySessions = async (
  token?: string | null,
): Promise<SessionDto[]> => {
  try {
    const res = await apiGet<{ ok: boolean; sessions: SessionDto[] }>(
      "/sessions/me",
      token || null,
    );
    return res.sessions || [];
  } catch (err) {
    return [];
  }
};

export const getMyTotalSecondsFromServer = async (
  token?: string | null,
): Promise<number> => {
  const sessions = await getMySessions(token);
  const now = Date.now();
  let totalMs = 0;
  for (const s of sessions) {
    const start = s.startTime ? Date.parse(s.startTime) : NaN;
    const end = s.endTime ? Date.parse(s.endTime) : now;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start)
      totalMs += end - start;
  }
  return Math.floor(totalMs / 1000);
};
