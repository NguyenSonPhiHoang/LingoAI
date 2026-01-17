"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const progress_controller_1 = require("../controllers/progress.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protected routes
router.use(auth_middleware_1.authenticateJWT);
// Student: my progress
router.get("/me", progress_controller_1.ProgressController.getMyProgress);
router.post("/", progress_controller_1.ProgressController.upsert);
router.delete("/:lessonId", progress_controller_1.ProgressController.delete);
// Admin/Teacher: view user's progress
router.get("/user/:userId", (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), progress_controller_1.ProgressController.getByUser);
exports.default = router;
