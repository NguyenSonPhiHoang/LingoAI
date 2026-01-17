"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLessonRepository = void 0;
const db_1 = require("../db");
class UserLessonRepository {
    // Upsert via sp_UserLessons_Upsert
    static async upsert(ul) {
        const pool = await (0, db_1.getPool)();
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
    static async delete(userId, lessonId) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("UserId", userId)
            .input("LessonId", lessonId)
            .execute("sp_UserLessons_Delete");
    }
    // Get by user via sp_UserLessons_GetByUser
    static async findByUser(userId) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("UserId", userId)
            .execute("sp_UserLessons_GetByUser");
        return res.recordset.map((r) => ({
            userId: r.UserId,
            lessonId: r.LessonId,
            status: r.Status,
            progress: r.Progress,
            lastSeen: r.LastSeen ? new Date(r.LastSeen).toISOString() : undefined,
            lessonTitle: r.LessonTitle,
        }));
    }
}
exports.UserLessonRepository = UserLessonRepository;
