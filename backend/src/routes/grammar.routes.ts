import { Router } from "express";
import { requireAuth, authorizeRoles } from "../middleware/auth.middleware";
import { GrammarController } from "../controllers/grammar.controller";

const router = Router();

// Public to all authenticated users
router.get("/lessons", requireAuth, GrammarController.listLessons);
router.get("/lessons/:id", requireAuth, GrammarController.getLesson);
router.post(
  "/lessons/:id/attempts",
  requireAuth,
  GrammarController.submitAttempt,
);

// Content management (Admin/Teacher)
router.post(
  "/lessons",
  requireAuth,
  authorizeRoles("role_admin", "role_teacher"),
  GrammarController.createLesson,
);
router.put(
  "/lessons/:id",
  requireAuth,
  authorizeRoles("role_admin", "role_teacher"),
  GrammarController.updateLesson,
);
router.post(
  "/lessons/:id/exercises",
  requireAuth,
  authorizeRoles("role_admin", "role_teacher"),
  GrammarController.upsertExercises,
);

export default router;
