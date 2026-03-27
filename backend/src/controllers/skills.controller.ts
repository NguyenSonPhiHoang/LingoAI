import { Request, Response } from "express";
import { getAllActiveSkills } from "../utils/skill-validator";

export class SkillsController {
  /**
   * GET /api/skills
   * Get all active skills
   */
  static async list(req: Request, res: Response) {
    try {
      const skills = await getAllActiveSkills();
      res.json({ skills });
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  }
}
