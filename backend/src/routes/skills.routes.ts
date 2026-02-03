import { Router } from "express";
import { SkillsController } from "../controllers/skills.controller";

const router = Router();

/**
 * @route   GET /api/skills
 * @desc    Get all active skills
 * @access  Public
 */
router.get("/", SkillsController.list);

export default router;
