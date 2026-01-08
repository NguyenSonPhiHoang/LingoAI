import { Router } from "express";
import { StorybookController } from "../controllers/storybook.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Authenticated: list/get my storybooks
router.get("/me", authenticateJWT, StorybookController.listMe);
router.get(
  "/me/by-lesson/:lessonId",
  authenticateJWT,
  StorybookController.listMeByLesson
);
router.get("/me/:id", authenticateJWT, StorybookController.getMyById);

// Public: list and get (legacy)
router.get("/", StorybookController.list);
router.get("/:id", StorybookController.getById);
router.get("/:id/pages", StorybookController.getPages);

// Protected: create/update/delete (any authenticated user for their own storybooks)
router.post("/", authenticateJWT, StorybookController.create);
router.put("/:id", authenticateJWT, StorybookController.update);
router.delete("/:id", authenticateJWT, StorybookController.delete);

// Pages (Teacher or Admin)
router.post(
  "/:id/pages",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  StorybookController.createPage
);
router.put(
  "/:storybookId/pages/:pageId",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  StorybookController.updatePage
);
router.delete(
  "/:storybookId/pages/:pageId",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  StorybookController.deletePage
);

export default router;
