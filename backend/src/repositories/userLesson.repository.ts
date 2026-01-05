import { getPool } from "../db";

export interface UserLesson {
  userId: string;
  lessonId: string;
  status?: string | null;
  progress?: number | null;
  lastSeen?: string;
  lessonTitle?: string; // joined from Lessons
}

export class UserLessonRepository {
  // Upsert via sp_UserLessons_Upsert
  static async upsert(ul: UserLesson): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("UserId", ul.userId)
      .input("LessonId", ul.lessonId)
      .input("Status", ul.status || null)
      .input("Progress", ul.progress ?? null)
      .input("LastSeen", ul.lastSeen ? new Date(ul.lastSeen) : new Date())
      .execute("sp_UserLessons_Upsert");
  }

  // Delete via sp_UserLessons_Delete
  static async delete(userId: string, lessonId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("UserId", userId)
      .input("LessonId", lessonId)
      .execute("sp_UserLessons_Delete");
  }

  // Get by user via sp_UserLessons_GetByUser
  static async findByUser(userId: string): Promise<UserLesson[]> {
    const pool = await getPool();
    const res = await pool
      .request()
      .input("UserId", userId)
      .execute("sp_UserLessons_GetByUser");
    return res.recordset.map((r: any) => ({
      userId: r.UserId,
      lessonId: r.LessonId,
      status: r.Status,
      progress: r.Progress,
      lastSeen: r.LastSeen ? new Date(r.LastSeen).toISOString() : undefined,
      lessonTitle: r.LessonTitle,
    }));
  }
}
