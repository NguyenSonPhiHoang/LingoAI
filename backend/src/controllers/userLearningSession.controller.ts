import { Request, Response } from "express";
import { UserLearningSessionRepository } from "../repositories/userLearningSession.repository";

export class UserLearningSessionController {
  static async create(req: Request, res: Response) {
    try {
      const sub = (req as any).user?.sub;
      if (!sub) return res.status(401).json({ error: "unauthorized" });

      const payload = req.body || {};
      const row = {
        userId: sub,
        lessonId: payload.lessonId ?? null,
        startTime: payload.startTime ? new Date(payload.startTime) : new Date(),
        endTime: payload.endTime ? new Date(payload.endTime) : null,
        learningMode: payload.learningMode ?? null,
        accuracyRate: payload.accuracyRate ?? null,
        completed: !!payload.completed,
        ipAddress: req.ip || payload.ipAddress || null,
      };

      const id = await UserLearningSessionRepository.create(row as any);
      return res.json({ ok: true, id });
    } catch (err) {
      console.error("Create session error:", err);
      return res.status(500).json({ error: "create_failed" });
    }
  }

  static async getMySessions(req: Request, res: Response) {
    try {
      const sub = (req as any).user?.sub;
      if (!sub) return res.status(401).json({ error: "unauthorized" });
      const rows = await UserLearningSessionRepository.findByUser(sub);
      return res.json({ ok: true, sessions: rows });
    } catch (err) {
      console.error("Get sessions error:", err);
      return res.status(500).json({ error: "query_failed" });
    }
  }

  static async getByUser(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const rows = await UserLearningSessionRepository.findByUser(userId, 1000);
      return res.json({ ok: true, sessions: rows });
    } catch (err) {
      console.error("Get sessions by user error:", err);
      return res.status(500).json({ error: "query_failed" });
    }
  }
}

export default UserLearningSessionController;
