"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storybook_controller_1 = require("../controllers/storybook.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Authenticated: list/get my storybooks
router.get("/me", auth_middleware_1.authenticateJWT, storybook_controller_1.StorybookController.listMe);
router.get("/me/by-lesson/:lessonId", auth_middleware_1.authenticateJWT, storybook_controller_1.StorybookController.listMeByLesson);
router.get("/me/:id", auth_middleware_1.authenticateJWT, storybook_controller_1.StorybookController.getMyById);
// Public: list and get (legacy)
router.get("/", storybook_controller_1.StorybookController.list);
router.get("/:id", storybook_controller_1.StorybookController.getById);
router.get("/:id/pages", storybook_controller_1.StorybookController.getPages);
// Protected: create/update/delete (any authenticated user for their own storybooks)
router.post("/", auth_middleware_1.authenticateJWT, storybook_controller_1.StorybookController.create);
router.put("/:id", auth_middleware_1.authenticateJWT, storybook_controller_1.StorybookController.update);
router.delete("/:id", auth_middleware_1.authenticateJWT, storybook_controller_1.StorybookController.delete);
// Pages (Teacher or Admin)
router.post("/:id/pages", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), storybook_controller_1.StorybookController.createPage);
router.put("/:storybookId/pages/:pageId", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), storybook_controller_1.StorybookController.updatePage);
router.delete("/:storybookId/pages/:pageId", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), storybook_controller_1.StorybookController.deletePage);
exports.default = router;
