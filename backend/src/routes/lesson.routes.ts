import { Router } from "express";
import { LessonController } from "../controllers/lesson.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Public: list and get
router.get("/", LessonController.list);
router.get("/:id", LessonController.getById);
router.get("/author/:authorId", LessonController.getByAuthor);
router.get("/:id/vocabulary", LessonController.getVocabulary);

// Protected: create/update/delete (Teacher or Admin)
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  LessonController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  LessonController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  LessonController.delete
);

// Vocabulary links (Teacher or Admin)
router.post(
  "/:id/vocabulary",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  LessonController.addVocabulary
);
router.delete(
  "/:id/vocabulary/:vocabId",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  LessonController.removeVocabulary
);

export default router;
