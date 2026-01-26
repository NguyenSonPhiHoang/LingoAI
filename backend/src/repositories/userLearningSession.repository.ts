import { getPool } from "../db";

export interface UserLearningSession {
  sessionId?: number;
  userId: string; // app uses string user ids (Id NVARCHAR(100))
  lessonId?: number | null;
  startTime?: Date;
  endTime?: Date | null;
  learningMode?: string | null;
  accuracyRate?: number | null;
  completed?: boolean;
  ipAddress?: string | null;
}

export class UserLearningSessionRepository {
  static async create(s: UserLearningSession): Promise<number> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("UserId", s.userId)
      .input("LessonId", s.lessonId ?? null)
      .input("StartTime", s.startTime ?? new Date())
      .input("EndTime", s.endTime ?? null)
      .input("LearningMode", s.learningMode ?? null)
      .input("AccuracyRate", s.accuracyRate ?? null)
      .input("Completed", s.completed ? 1 : 0)
      .input("IPAddress", s.ipAddress ?? null)
      // Use OUTPUT to get inserted identity if available
      .query(
        `INSERT INTO UserLearningSessions
          (UserID, LessonID, StartTime, EndTime, LearningMode, AccuracyRate, Completed, IPAddress)
         OUTPUT INSERTED.SessionID
         VALUES (@UserId, @LessonId, @StartTime, @EndTime, @LearningMode, @AccuracyRate, @Completed, @IPAddress)`,
      );

    const inserted =
      res.recordset && res.recordset[0] ? res.recordset[0].SessionID : null;
    return inserted ?? 0;
  }

  static async findByUser(
    userId: string,
    limit = 100,
  ): Promise<UserLearningSession[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("UserId", userId)
      .query(
        `SELECT TOP (${limit}) SessionID AS sessionId, UserID AS userId, LessonID AS lessonId, StartTime, EndTime, LearningMode, AccuracyRate, Completed, IPAddress
         FROM UserLearningSessions
         WHERE UserID = @UserId
         ORDER BY StartTime DESC`,
      );

    return (res.recordset || []).map((r: any) => ({
      sessionId: r.sessionId,
      userId: r.userId,
      lessonId: r.lessonId,
      startTime: r.StartTime ? new Date(r.StartTime) : undefined,
      endTime: r.EndTime ? new Date(r.EndTime) : null,
      learningMode: r.LearningMode,
      accuracyRate: r.AccuracyRate,
      completed: !!r.Completed,
      ipAddress: r.IPAddress,
    }));
  }
}
