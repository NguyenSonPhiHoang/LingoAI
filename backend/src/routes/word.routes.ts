import { Router } from "express";
import { WordController } from "../controllers/word.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Protected: global words are managed by Teacher/Admin
router.get(
  "/",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  WordController.list
);

router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  WordController.update
);

export default router;
