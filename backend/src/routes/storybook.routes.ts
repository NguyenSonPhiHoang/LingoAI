import { Router } from "express";
import { StorybookController } from "../controllers/storybook.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Public: list and get
router.get("/", StorybookController.list);
router.get("/:id", StorybookController.getById);
router.get("/:id/pages", StorybookController.getPages);

// Protected: create/update/delete (Teacher or Admin)
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  StorybookController.create
);
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  StorybookController.update
);
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("role_admin", "role_teacher"),
  StorybookController.delete
);

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
