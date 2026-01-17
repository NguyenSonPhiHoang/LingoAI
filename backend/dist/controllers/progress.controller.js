"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressController = void 0;
const userLesson_repository_1 = require("../repositories/userLesson.repository");
class ProgressController {
    // GET /api/progress/me
    static async getMyProgress(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const progress = await userLesson_repository_1.UserLessonRepository.findByUser(userId);
            res.json(progress);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/progress/user/:userId (admin/teacher)
    static async getByUser(req, res) {
        try {
            const progress = await userLesson_repository_1.UserLessonRepository.findByUser(req.params.userId);
            res.json(progress);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/progress
    static async upsert(req, res) {
        try {
            const { lessonId, status, progress } = req.body;
            const userId = req.user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            if (!lessonId)
                return res.status(400).json({ error: "lessonId required" });
            await userLesson_repository_1.UserLessonRepository.upsert({
                userId,
                lessonId,
                status,
                progress,
            });
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // DELETE /api/progress/:lessonId
    static async delete(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            await userLesson_repository_1.UserLessonRepository.delete(userId, req.params.lessonId);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.ProgressController = ProgressController;
