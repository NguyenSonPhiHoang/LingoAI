import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  LearningResourceRepository,
  LevelKey,
  Skill,
} from "../repositories/learningResource.repository";

const LEVELS: LevelKey[] = ["a1", "a2", "b1", "b2", "c1", "c2"];
const SKILLS: Skill[] = [
  "Listening",
  "Speaking",
  "Reading",
  "Writing",
  "Pronunciation",
];

function getUserId(req: AuthRequest): string | null {
  const sub = req.user?.sub;
  return typeof sub === "string" && sub.trim() ? sub : null;
}

export class LearningResourceController {
  static async list(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const rows = await LearningResourceRepository.listAllForUser(userId);

    return res.json(
      rows.map((r) => ({
        id: r.id,
        level: r.level,
        skill: r.skill,
        label: r.label,
        url: r.url,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        ratings: r.userRating != null ? { [userId]: r.userRating } : {},
        ratingCount: r.ratingCount,
        averageRating: r.averageRating,
      }))
    );
  }

  static async create(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const { level, skill, label, url } = req.body || {};

    if (!LEVELS.includes(level)) {
      return res.status(400).json({ error: "invalid level" });
    }
    if (!SKILLS.includes(skill)) {
      return res.status(400).json({ error: "invalid skill" });
    }
    if (!label || typeof label !== "string") {
      return res.status(400).json({ error: "label required" });
    }
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url required" });
    }

    const id = `lr_${uuidv4()}`;
    await LearningResourceRepository.create({
      id,
      level,
      skill,
      label: label.trim(),
      url: url.trim(),
      createdByUserId: userId,
    });

    return res.status(201).json({
      id,
      level,
      skill,
      label: label.trim(),
      url: url.trim(),
      createdAt: new Date(),
      ratings: {},
      ratingCount: 0,
      averageRating: 0,
    });
  }

  static async delete(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const id = req.params.id;
    await LearningResourceRepository.delete(id);
    return res.json({ ok: true });
  }

  static async rate(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const id = req.params.id;
    const { rating } = req.body || {};

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "rating must be 1-5" });
    }

    const agg = await LearningResourceRepository.upsertRating({
      resourceId: id,
      userId,
      rating: ratingNum,
    });

    return res.json({
      averageRating: agg.averageRating,
      ratingCount: agg.ratingCount,
    });
  }
}
