import { Router } from "express";
import { VocabularyController } from "../controllers/vocabulary.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Public: list and get
router.get("/", VocabularyController.list);
router.get("/:id", VocabularyController.getById);

// Protected: create/update/delete (Teacher or Admin)
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  VocabularyController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  VocabularyController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  VocabularyController.delete
);

export default router;
