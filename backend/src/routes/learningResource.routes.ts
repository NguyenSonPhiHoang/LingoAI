import { Router } from "express";
import { requireAuth, authorizeRoles } from "../middleware/auth.middleware";
import { LearningResourceController } from "../controllers/learningResource.controller";

const router = Router();

// Everyone authenticated can view + rate
router.get("/", requireAuth, LearningResourceController.list);
router.post("/:id/rate", requireAuth, LearningResourceController.rate);

// Admin-only write
router.post(
  "/",
  requireAuth,
  authorizeRoles("role_admin"),
  LearningResourceController.create
);
router.delete(
  "/:id",
  requireAuth,
  authorizeRoles("role_admin"),
  LearningResourceController.delete
);

export default router;
