import { Router } from "express";
import { ProgressController } from "../controllers/progress.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Protected routes
router.use(authenticateJWT);

// Student: my progress
router.get("/me", ProgressController.getMyProgress);
router.post("/", ProgressController.upsert);
router.delete("/:lessonId", ProgressController.delete);

// Admin/Teacher: view user's progress
router.get(
  "/user/:userId",
  authorizeRoles("role_admin", "role_teacher"),
  ProgressController.getByUser
);

export default router;
