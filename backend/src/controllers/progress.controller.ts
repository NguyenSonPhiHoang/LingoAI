import { Request, Response } from "express";
import { UserLessonRepository } from "../repositories/userLesson.repository";
import { AuthRequest } from "../middleware/auth.middleware";

export class ProgressController {
  // GET /api/progress/me
  static async getMyProgress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });
      const progress = await UserLessonRepository.findByUser(userId);
      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/progress/user/:userId (admin/teacher)
  static async getByUser(req: Request, res: Response) {
    try {
      const progress = await UserLessonRepository.findByUser(req.params.userId);
      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/progress
  static async upsert(req: AuthRequest, res: Response) {
    try {
      const { lessonId, status, progress } = req.body;
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });
      if (!lessonId)
        return res.status(400).json({ error: "lessonId required" });
      await UserLessonRepository.upsert({
        userId,
        lessonId,
        status,
        progress,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/progress/:lessonId
  static async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });
      await UserLessonRepository.delete(userId, req.params.lessonId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
