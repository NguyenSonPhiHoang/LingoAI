import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { AiController } from "../controllers/ai.controller";

const router = Router();

// Authenticated users can chat with Gemini
router.post("/chat", requireAuth, AiController.chat);

// Reply suggestions for user to say next
router.post("/reply-suggestions", requireAuth, AiController.replySuggestions);

// Stateless translate for displaying translations in UI
router.post("/translate", requireAuth, AiController.translate);

export default router;
