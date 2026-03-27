import { Router } from "express";
import { VtepSpeakingController } from "../controllers/vtepSpeaking.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// ==================== PROMPTS ====================
// All prompt routes require authentication

router.post(
  "/prompts",
  requireAuth,
  VtepSpeakingController.createPrompt
);

router.get(
  "/prompts",
  requireAuth,
  VtepSpeakingController.listPrompts
);

router.get(
  "/prompts/:id",
  requireAuth,
  VtepSpeakingController.getPrompt
);

router.put(
  "/prompts/:id",
  requireAuth,
  VtepSpeakingController.updatePrompt
);

router.delete(
  "/prompts/:id",
  requireAuth,
  VtepSpeakingController.deletePrompt
);

// ==================== TESTS ====================

router.post(
  "/tests",
  requireAuth,
  VtepSpeakingController.createTest
);

router.post(
  "/tests/random",
  requireAuth,
  VtepSpeakingController.createRandomTest
);

router.get(
  "/tests",
  requireAuth,
  VtepSpeakingController.listTests
);

router.get(
  "/tests/:id",
  requireAuth,
  VtepSpeakingController.getTest
);

router.get(
  "/tests/:id/with-prompts",
  requireAuth,
  VtepSpeakingController.getTestWithPrompts
);

router.put(
  "/tests/:id",
  requireAuth,
  VtepSpeakingController.updateTest
);

router.delete(
  "/tests/:id",
  requireAuth,
  VtepSpeakingController.deleteTest
);

// Instantiate a Speaking test for a user (create a submission session)
router.post(
  "/tests/:id/instantiate",
  requireAuth,
  VtepSpeakingController.instantiateTest
);

// ==================== SUBMISSIONS ====================

router.post(
  "/submissions",
  requireAuth,
  VtepSpeakingController.createSubmission
);

router.get(
  "/submissions",
  requireAuth,
  VtepSpeakingController.listSubmissions
);

router.get(
  "/submissions/:id",
  requireAuth,
  VtepSpeakingController.getSubmission
);

router.put(
  "/submissions/:id",
  requireAuth,
  VtepSpeakingController.updateSubmission
);

router.delete(
  "/submissions/:id",
  requireAuth,
  VtepSpeakingController.deleteSubmission
);

// ==================== GRADING ====================

router.post(
  "/submissions/:id/grade",
  requireAuth,
  VtepSpeakingController.gradeSubmission
);

export default router;
