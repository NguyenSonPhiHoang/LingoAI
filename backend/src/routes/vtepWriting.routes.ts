import { Router } from "express";
import { VtepWritingController } from "../controllers/vtepWriting.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Health check
router.get("/health", (req, res) => res.json({ ok: true, message: "VTEP Writing API is running" }));

// Prompts management (admin/teacher only for create/update/delete)
router.post("/prompts", VtepWritingController.createPrompt);
router.get("/prompts", VtepWritingController.listPrompts);
router.get("/prompts/:id", VtepWritingController.getPrompt);
router.put("/prompts/:id", requireAuth, requireRole("Admin", "Teacher"), VtepWritingController.updatePrompt);
router.delete("/prompts/:id", requireAuth, requireRole("Admin", "Teacher"), VtepWritingController.deletePrompt);

// Tests management (admin/teacher only for create/update/delete)
router.post("/tests", VtepWritingController.createTest);
router.post("/tests/random", requireAuth, requireRole("Admin", "Teacher"), VtepWritingController.createRandomTest);
router.get("/tests", VtepWritingController.listTests);
router.get("/tests/active", VtepWritingController.listActiveTests);
router.get("/tests/:id", VtepWritingController.getTest);
router.put("/tests/:id", requireAuth, requireRole("Admin", "Teacher"), VtepWritingController.updateTest);
router.delete("/tests/:id", requireAuth, requireRole("Admin", "Teacher"), VtepWritingController.deleteTest);

// Submissions (students can submit, teachers can grade)
router.post("/submissions", requireAuth, VtepWritingController.createSubmission);
router.get("/submissions/me", requireAuth, VtepWritingController.getMySubmissions);
router.get("/submissions/:id", requireAuth, VtepWritingController.getSubmission);
router.post("/submissions/:id/grade", requireAuth, requireRole("Admin", "Teacher"), VtepWritingController.gradeSubmission);

export default router;
